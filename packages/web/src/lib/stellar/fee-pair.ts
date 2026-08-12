'use client';

import type { NetworkConfig } from '@normalfinance/types';
// Type-only import — erased at compile time, so the server-only module
// (prisma/redis) never enters the client bundle.
import type { SwapRecordInput, SavingsRecordInput } from '@/server/tx-records';

import { buildAuthHeaders } from '@/utils/http';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';

// ---------------------------------------------------------------------------
// Client half of the #26 sign-both-first fee pairing.
//
// Flow (deposit example — withdraw and swap are identical in shape):
//   1. build the service tx (deposit) — it carries sequence N+1
//   2. build the fee tx chained behind it (sourceSequence = service tx's
//      sequence → the fee gets N+2, with a 15-minute window)
//   3. sign BOTH — a rejection at either prompt aborts with nothing
//      submitted and nothing charged
//   4. hand both signed XDRs to /api/fees/execute-pair via submitFeePair()
//      below — the server escrows the fee before submitting anything, so
//      completion is server-owned from that point (tab can die, cron sweeps)
// ---------------------------------------------------------------------------

export type FeePairKind = 'savings_deposit' | 'savings_withdraw' | 'swap';

export type FeePairRecord = SavingsRecordInput | SwapRecordInput;

export interface FeePairResult {
  serviceHash: string;
  /** null when the flow has no fee leg (zero-commission withdraw). */
  feeHash: string | null;
  /** false = fee is escrowed and the cron sweeper will collect it shortly. */
  feeSubmitted: boolean;
}

/** Sequence number of a built (unsigned or signed) transaction XDR. */
export function getTransactionSequence(xdr: string, networkPassphrase: string): string {
  const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
  if (!('sequence' in tx)) {
    throw new Error('Cannot read sequence from a fee-bump transaction');
  }
  return tx.sequence;
}

const POLL_INTERVAL_MS = 4_000;
const POLL_ATTEMPTS = 10;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type OnChainStatus = 'success' | 'failed' | 'not_found';

async function probeOnChain(server: Horizon.Server, hash: string): Promise<OnChainStatus> {
  try {
    const tx = await server.transactions().transaction(hash).call();
    return (tx as { successful?: boolean }).successful !== false ? 'success' : 'failed';
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return 'not_found';
    throw err;
  }
}

/** Poll Horizon until the tx appears (or we give up after ~40s). */
async function awaitOnChain(server: Horizon.Server, hash: string): Promise<OnChainStatus> {
  for (let i = 0; i < POLL_ATTEMPTS; i += 1) {
    try {
      const status = await probeOnChain(server, hash);
      if (status !== 'not_found') return status;
    } catch {
      // Horizon hiccup — keep polling.
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return 'not_found';
}

/**
 * Submit a signed service tx — with its fee tx when the flow charges one —
 * through the server funnel, which records it before broadcasting (#27).
 *
 * Throws with a user-facing message when the SERVICE outcome is a failure or
 * unknown; a fee that could not be submitted yet is NOT an error (the sweeper
 * owns it) and is reported via `feeSubmitted: false`.
 *
 * Retrying after ANY throw from here is always safe: a fresh pair reuses the
 * same sequence numbers, so at most one pair can ever apply on-chain.
 */
export async function submitFeePair(params: {
  signedServiceXdr: string;
  /** null = no fee leg (zero-commission withdraw). */
  signedFeeXdr: string | null;
  kind: FeePairKind;
  record: FeePairRecord;
  config: NetworkConfig;
}): Promise<FeePairResult> {
  const { signedServiceXdr, signedFeeXdr, kind, record, config } = params;

  const serviceTx = TransactionBuilder.fromXDR(signedServiceXdr, config.NETWORK_PASSPHRASE);
  const serviceHash = serviceTx.hash().toString('hex');
  const server = new Horizon.Server(config.HORIZON_URL, {
    allowHttp: config.HORIZON_URL.startsWith('http://'),
  });

  let response: Response;
  try {
    response = await fetch('/api/fees/execute-pair', {
      method: 'POST',
      headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceXdr: signedServiceXdr, feeXdr: signedFeeXdr, kind, record }),
    });
  } catch {
    // The request itself died — we cannot tell whether it reached the server.
    // If the service tx made it out, its hash will appear on Horizon shortly.
    const status = await awaitOnChain(server, serviceHash);
    if (status === 'success') {
      const feeHash = signedFeeXdr
        ? TransactionBuilder.fromXDR(signedFeeXdr, config.NETWORK_PASSPHRASE).hash().toString('hex')
        : null;
      return { serviceHash, feeHash, feeSubmitted: false };
    }
    if (status === 'failed') {
      throw new Error('Transaction failed on-chain. No fee was charged.');
    }
    throw new Error(
      'Could not confirm submission. Check your activity in a minute — if nothing appears, it is safe to try again.'
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to submit transaction. No fee was charged.');
  }

  if (data.servicePending) {
    // Horizon timed out server-side; the tx usually lands within seconds.
    const status = await awaitOnChain(server, data.serviceHash);
    if (status === 'failed') {
      throw new Error('Transaction failed on-chain. No fee was charged.');
    }
    if (status === 'not_found') {
      throw new Error(
        'Your transaction is taking longer than expected. Check your activity in a couple of minutes before trying again.'
      );
    }
  }

  return {
    serviceHash: data.serviceHash,
    feeHash: data.feeHash,
    feeSubmitted: !!data.feeSubmitted,
  };
}

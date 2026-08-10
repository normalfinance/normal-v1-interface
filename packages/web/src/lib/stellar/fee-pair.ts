'use client';

import type { NetworkConfig } from '@normalfinance/types';

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

export interface FeePairResult {
  serviceHash: string;
  feeHash: string;
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
 * Submit a signed service+fee pair through the server.
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
  signedFeeXdr: string;
  kind: FeePairKind;
  config: NetworkConfig;
}): Promise<FeePairResult> {
  const { signedServiceXdr, signedFeeXdr, kind, config } = params;

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
      body: JSON.stringify({ serviceXdr: signedServiceXdr, feeXdr: signedFeeXdr, kind }),
    });
  } catch {
    // The request itself died — we cannot tell whether it reached the server.
    // If the service tx made it out, its hash will appear on Horizon shortly.
    const status = await awaitOnChain(server, serviceHash);
    if (status === 'success') {
      const feeTx = TransactionBuilder.fromXDR(signedFeeXdr, config.NETWORK_PASSPHRASE);
      return { serviceHash, feeHash: feeTx.hash().toString('hex'), feeSubmitted: false };
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

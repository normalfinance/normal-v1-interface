import type { NetworkType } from '@normalfinance/utils';

import { redis } from '@/server/rateLimiter';
import { getStellarConfigForNetwork } from '@normalfinance/utils';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';

// ---------------------------------------------------------------------------
// Fee-pair escrow (#26 — fee ordering).
//
// A savings deposit/withdraw or swap charges a Normal fee as a SECOND Stellar
// transaction. The old flows submitted one tx, then asked for the second
// signature — so a rejection, wallet jam, or closed tab left either a fee
// with no service (the Lobstr incident) or a service with no fee.
//
// The fix: the client collects BOTH signatures before anything is submitted,
// then hands both signed XDRs to /api/fees/execute-pair. That route stores
// the pair HERE (Upstash Redis) before submitting anything, so completion is
// server-owned from that moment on: if the route dies mid-sequence, the cron
// sweeper (/api/cron/fee-escrow-sweep) finishes the job.
//
// Safety comes from Stellar sequence numbers, not from us being careful:
//   - fee tx sequence = service tx sequence + 1, so the fee can never apply
//     unless the service applied first;
//   - if the user retries a stuck flow, the new pair reuses the same
//     sequences, which makes the old escrowed pair permanently unsubmittable
//     (tx_bad_seq) — no double-charge is possible;
//   - the fee tx carries ~15-minute timebounds, so an escrow entry we fail to
//     drive to completion is guaranteed dead on-chain after the window.
//
// Idempotency: every actor (route, sweeper, retries) probes the tx hash on
// Horizon BEFORE submitting. Submitting the same XDR twice is also harmless —
// a tx is identified by hash and can only ever apply once.
// ---------------------------------------------------------------------------

export type FeeEscrowKind = 'savings_deposit' | 'savings_withdraw' | 'swap';

export type FeeEscrowStatus =
  | 'pending' // waiting for the pair to complete
  | 'completed' // fee landed — the pair is done
  | 'service_failed' // service tx failed on-chain — fee correctly never sent
  | 'abandoned' // neither tx landed and both windows closed — nothing charged
  | 'superseded' // sequences consumed by a newer pair — this one is dead, nothing double-charged
  | 'fee_failed' // fee tx applied but FAILED on-chain — terminal, needs a human
  | 'expired'; // service SUCCEEDED but fee window closed unpaid — the receivable case

export interface FeeEscrowEntry {
  feeXdr: string; // signed
  feeHash: string;
  serviceXdr: string; // signed — the sweeper can submit it if the route died first
  serviceHash: string;
  network: NetworkType;
  userId: string;
  walletAddress: string;
  kind: FeeEscrowKind;
  createdAtMs: number;
  feeExpiresAtMs: number; // fee tx maxTime — after this the fee is dead on-chain
  serviceExpiresAtMs: number; // service tx maxTime (falls back to feeExpiresAtMs)
  status: FeeEscrowStatus;
}

// Keep resolved entries a day past their window for post-mortems.
const RESOLVED_RETENTION_SECONDS = 86_400;

// The sweeper leaves very fresh entries alone — their execute-pair invocation
// is likely still running and owns them.
const SWEEP_MIN_AGE_MS = 60_000;

const entryKey = (network: NetworkType, feeHash: string) =>
  `fee-escrow:entry:${network}:${feeHash}`;
const pendingSetKey = (network: NetworkType) => `fee-escrow:pending:${network}`;

// Entries can exist under either network regardless of which deployment is
// sweeping — the network comes from a per-request cookie, the Redis DB from
// the deployment env — so the sweeper always checks both sets.
const NETWORKS: NetworkType[] = ['testnet', 'mainnet'];

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export async function escrowFeePair(entry: FeeEscrowEntry): Promise<void> {
  const ttlSeconds =
    Math.max(0, Math.ceil((entry.feeExpiresAtMs - entry.createdAtMs) / 1000)) +
    RESOLVED_RETENTION_SECONDS;
  await redis.set(entryKey(entry.network, entry.feeHash), entry, { ex: ttlSeconds });
  await redis.sadd(pendingSetKey(entry.network), entry.feeHash);
}

export async function resolveEscrow(
  network: NetworkType,
  feeHash: string,
  status: Exclude<FeeEscrowStatus, 'pending'>
): Promise<void> {
  const key = entryKey(network, feeHash);
  const entry = await redis.get<FeeEscrowEntry>(key);
  if (entry) {
    await redis.set(key, { ...entry, status }, { ex: RESOLVED_RETENTION_SECONDS });
  }
  await redis.srem(pendingSetKey(network), feeHash);

  if (status === 'expired') {
    // The one genuinely bad outcome: the user's action succeeded and the fee
    // window closed unpaid. The client's log row already carries the fee hash,
    // so this is traceable — but it should be lightning-strike rare.
    console.error('[fee-escrow] RECEIVABLE — service succeeded, fee window closed unpaid', {
      network,
      feeHash,
      serviceHash: entry?.serviceHash,
      kind: entry?.kind,
      walletAddress: entry?.walletAddress,
    });
  }
  if (status === 'fee_failed') {
    console.error('[fee-escrow] fee tx applied but FAILED on-chain — inspect manually', {
      network,
      feeHash,
      serviceHash: entry?.serviceHash,
    });
  }
}

// ---------------------------------------------------------------------------
// Decision logic — pure, so the state machine is unit-testable without Horizon
// ---------------------------------------------------------------------------

export type TxProbe = { state: 'not_found' } | { state: 'found'; successful: boolean };

export type EscrowAction =
  | { type: 'complete' }
  | { type: 'submit_fee' }
  | { type: 'submit_service' }
  | { type: 'resolve'; status: 'service_failed' | 'abandoned' | 'fee_failed' | 'expired' }
  | { type: 'wait' };

export function decideEscrowAction(
  entry: Pick<FeeEscrowEntry, 'feeExpiresAtMs' | 'serviceExpiresAtMs'>,
  feeProbe: TxProbe,
  serviceProbe: TxProbe,
  nowMs: number
): EscrowAction {
  // Fee already on chain — the pair is finished one way or the other.
  if (feeProbe.state === 'found') {
    return feeProbe.successful ? { type: 'complete' } : { type: 'resolve', status: 'fee_failed' };
  }

  if (serviceProbe.state === 'found') {
    if (!serviceProbe.successful) {
      // Service failed in consensus — the fee must never be sent.
      return { type: 'resolve', status: 'service_failed' };
    }
    // Service succeeded; the fee is owed. Timebounds decide if it's still collectable.
    if (nowMs >= entry.feeExpiresAtMs) return { type: 'resolve', status: 'expired' };
    return { type: 'submit_fee' };
  }

  // Neither landed. If the service's own window is still open, the route died
  // before submitting — finish the job the user signed off on.
  if (nowMs < entry.serviceExpiresAtMs) return { type: 'submit_service' };

  // Service window closed without landing. Once the fee window is closed too,
  // the whole pair is provably dead and nothing was charged.
  if (nowMs >= entry.feeExpiresAtMs) return { type: 'resolve', status: 'abandoned' };
  return { type: 'wait' };
}

// ---------------------------------------------------------------------------
// Horizon plumbing
// ---------------------------------------------------------------------------

function horizonFor(network: NetworkType): Horizon.Server {
  const config = getStellarConfigForNetwork(network);
  return new Horizon.Server(config.HORIZON_URL, {
    allowHttp: config.HORIZON_URL.startsWith('http://'),
  });
}

export async function probeTransaction(server: Horizon.Server, hash: string): Promise<TxProbe> {
  try {
    const tx = await server.transactions().transaction(hash).call();
    return { state: 'found', successful: (tx as { successful?: boolean }).successful !== false };
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return { state: 'not_found' };
    throw err;
  }
}

type SubmitOutcome =
  | { outcome: 'success' }
  | { outcome: 'failed'; resultCodes?: unknown } // rejected with result codes — terminal for this tx
  | { outcome: 'unknown' }; // timeout/transient — the tx may still apply

export async function submitSignedXdr(
  server: Horizon.Server,
  xdr: string,
  networkPassphrase: string
): Promise<SubmitOutcome> {
  try {
    const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
    await server.submitTransaction(tx);
    return { outcome: 'success' };
  } catch (err: unknown) {
    const response = (
      err as { response?: { status?: number; data?: { extras?: { result_codes?: unknown } } } }
    )?.response;
    const resultCodes = response?.data?.extras?.result_codes;
    if (resultCodes) return { outcome: 'failed', resultCodes };
    // No result codes = Horizon never rejected it (timeout, 5xx, network) —
    // the tx may still land, so the caller must NOT treat this as terminal.
    return { outcome: 'unknown' };
  }
}

function isSequenceError(resultCodes: unknown): boolean {
  return (resultCodes as { transaction?: string })?.transaction === 'tx_bad_seq';
}

function isTooLateError(resultCodes: unknown): boolean {
  return (resultCodes as { transaction?: string })?.transaction === 'tx_too_late';
}

// ---------------------------------------------------------------------------
// Advancing one entry — shared by the execute-pair route and the sweeper
// ---------------------------------------------------------------------------

export interface AdvanceResult {
  feeHash: string;
  action: EscrowAction['type'] | 'resolved';
  status?: FeeEscrowStatus;
}

/**
 * Probe both txs, decide, and act. Safe to call concurrently or repeatedly —
 * every submission is hash-probed first and Stellar dedupes by hash anyway.
 */
export async function advanceEscrowEntry(entry: FeeEscrowEntry): Promise<AdvanceResult> {
  const config = getStellarConfigForNetwork(entry.network);
  const server = horizonFor(entry.network);

  const [feeProbe, serviceProbe] = await Promise.all([
    probeTransaction(server, entry.feeHash),
    probeTransaction(server, entry.serviceHash),
  ]);

  const action = decideEscrowAction(entry, feeProbe, serviceProbe, Date.now());

  switch (action.type) {
    case 'complete': {
      await resolveEscrow(entry.network, entry.feeHash, 'completed');
      return { feeHash: entry.feeHash, action: 'resolved', status: 'completed' };
    }
    case 'resolve': {
      await resolveEscrow(entry.network, entry.feeHash, action.status);
      return { feeHash: entry.feeHash, action: 'resolved', status: action.status };
    }
    case 'submit_service': {
      const res = await submitSignedXdr(server, entry.serviceXdr, config.NETWORK_PASSPHRASE);
      if (res.outcome === 'success') {
        // Service just landed — collect the fee in the same pass.
        const fee = await submitSignedXdr(server, entry.feeXdr, config.NETWORK_PASSPHRASE);
        if (fee.outcome === 'success') {
          await resolveEscrow(entry.network, entry.feeHash, 'completed');
          return { feeHash: entry.feeHash, action: 'resolved', status: 'completed' };
        }
        return { feeHash: entry.feeHash, action: 'submit_service' };
      }
      if (res.outcome === 'failed') {
        const status = isSequenceError(res.resultCodes) ? 'superseded' : 'service_failed';
        await resolveEscrow(entry.network, entry.feeHash, status);
        return { feeHash: entry.feeHash, action: 'resolved', status };
      }
      return { feeHash: entry.feeHash, action: 'submit_service' };
    }
    case 'submit_fee': {
      const res = await submitSignedXdr(server, entry.feeXdr, config.NETWORK_PASSPHRASE);
      if (res.outcome === 'success') {
        await resolveEscrow(entry.network, entry.feeHash, 'completed');
        return { feeHash: entry.feeHash, action: 'resolved', status: 'completed' };
      }
      if (res.outcome === 'failed') {
        if (isSequenceError(res.resultCodes)) {
          // The user (or another app) consumed the sequence after the service
          // succeeded — the fee is unrecoverable. Same receivable bucket.
          await resolveEscrow(entry.network, entry.feeHash, 'expired');
          return { feeHash: entry.feeHash, action: 'resolved', status: 'expired' };
        }
        if (isTooLateError(res.resultCodes)) {
          await resolveEscrow(entry.network, entry.feeHash, 'expired');
          return { feeHash: entry.feeHash, action: 'resolved', status: 'expired' };
        }
        // Unexpected rejection (e.g. op_underfunded right now) — keep pending,
        // the timebounds bound how long we retry.
        return { feeHash: entry.feeHash, action: 'submit_fee' };
      }
      return { feeHash: entry.feeHash, action: 'submit_fee' };
    }
    case 'wait':
    default:
      return { feeHash: entry.feeHash, action: 'wait' };
  }
}

// ---------------------------------------------------------------------------
// The cron sweep
// ---------------------------------------------------------------------------

export async function sweepFeeEscrow(): Promise<{ scanned: number; results: AdvanceResult[] }> {
  const results: AdvanceResult[] = [];
  let scanned = 0;

  for (const network of NETWORKS) {
    const feeHashes = await redis.smembers(pendingSetKey(network));
    for (const feeHash of feeHashes) {
      scanned += 1;
      const entry = await redis.get<FeeEscrowEntry>(entryKey(network, feeHash));
      if (!entry) {
        // Entry TTL'd out from under the set — nothing left to act on.
        await redis.srem(pendingSetKey(network), feeHash);
        continue;
      }
      if (Date.now() - entry.createdAtMs < SWEEP_MIN_AGE_MS) continue;
      try {
        results.push(await advanceEscrowEntry(entry));
      } catch (err) {
        // Horizon hiccup on this entry — leave it pending, next tick retries.
        console.warn('[fee-escrow] sweep error for', feeHash, err);
      }
    }
  }

  return { scanned, results };
}

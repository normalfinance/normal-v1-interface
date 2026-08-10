import type { NetworkType } from '@normalfinance/utils';
import type { TxProbe, FeeEscrowKind, FeeEscrowStatus } from '@/server/fee-escrow';

import { prisma } from '@/lib/prisma';
import { redis } from '@/server/rateLimiter';
import { Horizon } from '@stellar/stellar-sdk';
import { probeTransaction } from '@/server/fee-escrow';
import { getStellarConfigForNetwork } from '@normalfinance/utils';

// ---------------------------------------------------------------------------
// #27 record-before-broadcast.
//
// Every Stellar money flow that goes through /api/fees/execute-pair gets a
// durable DB row (vault_deposits or swap_logs) with status 'pending' BEFORE
// anything is broadcast, flipped by the route to a truthful outcome — and,
// when the route dies mid-flight, settled by the cron reconciler below or by
// the fee-escrow sweeper. A transaction can no longer succeed, fail, or
// vanish without the server having a record that says so.
//
// Status model:
//   pending    row exists, nothing broadcast yet
//   submitted  broadcast, outcome unknown (Horizon timeout)
//   confirmed / failed / abandoned   terminal
//
// Terminal states are never overwritten (updates guard on non-terminal), so
// route, sweeper, and reconciler can all act on the same row idempotently in
// any order — the chain, probed by tx hash, is the single source of truth.
// ---------------------------------------------------------------------------

export type TxRecordKind = FeeEscrowKind;

export type TxRecordStatus = 'pending' | 'submitted' | 'confirmed' | 'failed' | 'abandoned';

const NON_TERMINAL: TxRecordStatus[] = ['pending', 'submitted'];

// A tx not found on Horizon this long after record creation can never apply:
// every tx in these flows carries timebounds of 15 minutes or less.
export const RECORD_ABANDON_AFTER_MS = 30 * 60 * 1000;

// The reconciler leaves very fresh rows alone — their execute-pair
// invocation is likely still running and owns them.
const RECONCILE_MIN_AGE_MS = 60_000;

export interface SavingsRecordInput {
  vaultAddress: string;
  amount: string; // human-readable USDC (net for deposits)
  feeAmount: string | null;
}

export interface SwapRecordInput {
  tokenInAddress: string;
  tokenOutAddress: string;
  tokenInSymbol?: string;
  tokenOutSymbol?: string;
  amountIn: string; // net amount routed through the swap
  amountOut: string;
  feeAmount: string;
}

export type TxRecordInput =
  | { kind: 'savings_deposit' | 'savings_withdraw'; record: SavingsRecordInput }
  | { kind: 'swap'; record: SwapRecordInput };

// ---------------------------------------------------------------------------
// #55 cache invalidation — the record IS the signal the caches are stale.
// Shared with savings/log-transaction (legacy route) so there is one rule.
// ---------------------------------------------------------------------------

export async function invalidateSavingsPositionCache(
  walletAddress: string,
  network: string
): Promise<void> {
  try {
    await redis.del(
      `savings:pos:${walletAddress}:${network}`,
      `savings:pos:floor:${walletAddress}:${network}`
    );
  } catch {
    /* best-effort — TTLs bound any staleness */
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createPendingRecord(params: {
  input: TxRecordInput;
  walletAddress: string;
  network: NetworkType;
  serviceHash: string;
  feeHash: string | null;
}): Promise<void> {
  const { input, walletAddress, network, serviceHash, feeHash } = params;

  if (input.kind === 'swap') {
    const r = input.record;
    await prisma.swapLog.create({
      data: {
        walletAddress,
        tokenInAddress: r.tokenInAddress,
        tokenOutAddress: r.tokenOutAddress,
        tokenInSymbol: r.tokenInSymbol ?? null,
        tokenOutSymbol: r.tokenOutSymbol ?? null,
        amountIn: r.amountIn,
        amountOut: r.amountOut,
        feeAmount: r.feeAmount,
        feeTxHash: feeHash,
        txHash: serviceHash,
        status: 'pending',
        network,
      },
    });
    return;
  }

  const r = input.record;
  await prisma.vaultDeposit.create({
    data: {
      walletAddress,
      vaultAddress: r.vaultAddress,
      type: input.kind === 'savings_deposit' ? 'deposit' : 'withdraw',
      amount: r.amount,
      feeAmount: r.feeAmount,
      feeTxHash: feeHash,
      txHash: serviceHash,
      status: 'pending',
      network,
    },
  });
}

/**
 * Move a record to a new status by its service tx hash. Terminal states are
 * never overwritten, so late/racing actors cannot rewrite settled history.
 * Savings confirms invalidate the #55 position cache — a deposit completed by
 * the sweeper after the tab died must still update "Your Deposits".
 */
export async function settleRecord(params: {
  kind: TxRecordKind;
  serviceHash: string;
  status: Exclude<TxRecordStatus, 'pending'>;
  reason?: string;
  walletAddress?: string;
  network?: string;
}): Promise<void> {
  const { kind, serviceHash, status, reason, walletAddress, network } = params;
  const where = { txHash: serviceHash, status: { in: NON_TERMINAL } };
  const data = { status, statusReason: reason ?? null };

  if (kind === 'swap') {
    await prisma.swapLog.updateMany({ where, data });
  } else {
    await prisma.vaultDeposit.updateMany({ where, data });
    if (status === 'confirmed' && walletAddress && network) {
      await invalidateSavingsPositionCache(walletAddress, network);
    }
  }
}

/** Attach a note without touching status (e.g. "fee_uncollected" on a confirmed row). */
export async function annotateRecord(params: {
  kind: TxRecordKind;
  serviceHash: string;
  reason: string;
}): Promise<void> {
  const { kind, serviceHash, reason } = params;
  if (kind === 'swap') {
    await prisma.swapLog.updateMany({
      where: { txHash: serviceHash },
      data: { statusReason: reason },
    });
  } else {
    await prisma.vaultDeposit.updateMany({
      where: { txHash: serviceHash },
      data: { statusReason: reason },
    });
  }
}

// ---------------------------------------------------------------------------
// Settlement decisions — pure, pinned by tx-records.test.ts
// ---------------------------------------------------------------------------

export function decideRecordSettlement(
  probe: TxProbe,
  createdAtMs: number,
  nowMs: number,
  abandonAfterMs: number = RECORD_ABANDON_AFTER_MS
): { status: 'confirmed' | 'failed' | 'abandoned' } | { status: 'wait' } {
  if (probe.state === 'found') {
    return { status: probe.successful ? 'confirmed' : 'failed' };
  }
  if (nowMs - createdAtMs > abandonAfterMs) return { status: 'abandoned' };
  return { status: 'wait' };
}

/**
 * Map a fee-escrow terminal outcome onto the record. The record reflects the
 * SERVICE outcome — 'expired'/'fee_failed' mean the user's action SUCCEEDED
 * and only the fee leg went wrong, so the record confirms with a note (the
 * receivable is tracked by the escrow's own logging).
 */
export function escrowStatusToRecordUpdate(
  status: FeeEscrowStatus
):
  | { status: 'confirmed' | 'failed' | 'abandoned'; reason?: string }
  | { reasonOnly: string }
  | null {
  switch (status) {
    case 'completed':
      return { status: 'confirmed' };
    case 'service_failed':
      return { status: 'failed', reason: 'service transaction failed on-chain' };
    case 'abandoned':
      return { status: 'abandoned' };
    case 'superseded':
      return { status: 'abandoned', reason: 'superseded by a retried transaction pair' };
    case 'expired':
      return { status: 'confirmed', reason: 'fee_uncollected' };
    case 'fee_failed':
      return { status: 'confirmed', reason: 'fee_tx_failed' };
    default:
      return null; // 'pending' — nothing to record yet
  }
}

// ---------------------------------------------------------------------------
// Cron reconciliation — settles rows whose execute-pair invocation died
// ---------------------------------------------------------------------------

interface StuckRow {
  kind: TxRecordKind;
  txHash: string | null;
  walletAddress: string;
  network: string | null;
  createdAt: Date;
}

export async function reconcileTxRecords(): Promise<{ scanned: number; settled: number }> {
  const cutoff = new Date(Date.now() - RECONCILE_MIN_AGE_MS);

  const [vaultRows, swapRows] = await Promise.all([
    prisma.vaultDeposit.findMany({
      where: { status: { in: NON_TERMINAL }, createdAt: { lt: cutoff } },
      select: { type: true, txHash: true, walletAddress: true, network: true, createdAt: true },
    }),
    prisma.swapLog.findMany({
      where: { status: { in: NON_TERMINAL }, createdAt: { lt: cutoff } },
      select: { txHash: true, walletAddress: true, network: true, createdAt: true },
    }),
  ]);

  const rows: StuckRow[] = [
    ...vaultRows.map((r) => ({
      kind: (r.type === 'deposit' ? 'savings_deposit' : 'savings_withdraw') as TxRecordKind,
      txHash: r.txHash,
      walletAddress: r.walletAddress,
      network: r.network,
      createdAt: r.createdAt,
    })),
    ...swapRows.map((r) => ({
      kind: 'swap' as TxRecordKind,
      txHash: r.txHash,
      walletAddress: r.walletAddress,
      network: r.network,
      createdAt: r.createdAt,
    })),
  ];

  let settled = 0;
  const servers = new Map<string, Horizon.Server>();

  for (const row of rows) {
    // Only new-path writes create non-terminal rows and they always set both;
    // anything else is unprobe-able and left for manual inspection.
    if (!row.txHash || !row.network) continue;

    try {
      let server = servers.get(row.network);
      if (!server) {
        const config = getStellarConfigForNetwork(row.network as NetworkType);
        server = new Horizon.Server(config.HORIZON_URL, {
          allowHttp: config.HORIZON_URL.startsWith('http://'),
        });
        servers.set(row.network, server);
      }

      const probe = await probeTransaction(server, row.txHash);
      const decision = decideRecordSettlement(probe, row.createdAt.getTime(), Date.now());
      if (decision.status === 'wait') continue;

      await settleRecord({
        kind: row.kind,
        serviceHash: row.txHash,
        status: decision.status,
        reason:
          decision.status === 'abandoned' ? 'never reached the network before expiry' : undefined,
        walletAddress: row.walletAddress,
        network: row.network,
      });
      settled += 1;
    } catch (err) {
      // Horizon hiccup — leave the row, next tick retries.
      console.warn('[tx-records] reconcile error for', row.txHash, err);
    }
  }

  return { scanned: rows.length, settled };
}

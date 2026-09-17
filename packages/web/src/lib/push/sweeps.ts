import type { ChainId } from '@/lib/chains/registry';

import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { getChain, isChainId } from '@/lib/chains/registry';
import {
  lookupLifiStatus,
  lifiChainIdForSymbol,
  lookupLifiStatusByChainIds,
} from '@/server/lifi-status';

import { sendPush } from './send';
import { pushActive, shouldUnclaim } from './policy';
import {
  isLifiTerminal,
  buildSendPayload,
  buildLifiPayload,
  buildCctpPayload,
  cctpTerminalKind,
  sendTerminalKind,
} from './messages';

// ---------------------------------------------------------------------------
// The closed-app case. Each sweep reads rows that reached a user-visible end
// and have not been notified, CLAIMS each one with a compare-and-swap on
// notifiedAt (updateMany where notifiedAt is still null; count === 1 wins),
// and only then sends. Two overlapping cron ticks cannot double-notify.
//
// Every sweep returns before its first query unless pushActive(): production,
// staging and localhost share ONE database, so an environment without
// provider credentials must never claim a row it cannot send.
//
// A claim whose delivery failed for a retryable reason is given back
// (shouldUnclaim), so the next tick retries inside the window. Rows older
// than the window are ignored; the SQL backfill marked history as notified.
// ---------------------------------------------------------------------------

const WINDOW_MS = 48 * 60 * 60 * 1000;
const LIFI_WINDOW_MS = 24 * 60 * 60 * 1000;
const BATCH = 50;
/** LI.FI lookups on the cron path: 25 rows × 15 s would blow maxDuration. */
const LIFI_LOOKUP_TIMEOUT_MS = 8_000;
const LIFI_LOOKUP_CONCURRENCY = 5;
/** The CCTP pivot leg starts on Base (USDC) — the one LI.FI source we know by id. */
const BASE_CHAIN_ID = lifiChainIdForSymbol('USDC_BASE');

const opts = () => ({ includeAmounts: process.env.PUSH_INCLUDE_AMOUNTS === '1' });

export interface SweepCounts {
  scanned: number;
  notified: number;
  skipped: number;
  retried: number;
}

const zero = (): SweepCounts => ({ scanned: 0, notified: 0, skipped: 0, retried: 0 });

async function inChunks<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const settled = await Promise.allSettled(items.slice(i, i + size).map(fn));
    for (const s of settled) if (s.status === 'fulfilled') out.push(s.value);
  }
  return out;
}

// ----- CCTP -----------------------------------------------------------------

type CctpRow = {
  id: string;
  userId: string;
  direction: string;
  status: string;
  dstAsset: string;
  dstAmount: string | null;
  dstSwapTxHash: string | null;
};

async function claimAndSendCctp(
  row: CctpRow,
  kind: 'completed' | 'refunded' | 'failed',
  counts: SweepCounts
): Promise<void> {
  const claimed = await prisma.cctpTransfer.updateMany({
    where: { id: row.id, notifiedAt: null },
    data: { notifiedAt: new Date() },
  });
  if (claimed.count !== 1) return;
  const outcome = await sendPush({
    supabaseUid: row.userId,
    payload: buildCctpPayload(row, kind, opts()),
  });
  if (shouldUnclaim(outcome)) {
    await prisma.cctpTransfer.updateMany({ where: { id: row.id }, data: { notifiedAt: null } });
    counts.retried += 1;
    return;
  }
  counts.notified += 1;
}

export async function notifyTerminalCctp(): Promise<SweepCounts> {
  const counts = zero();
  if (!pushActive()) return counts;
  const rows = await prisma.cctpTransfer.findMany({
    where: {
      notifiedAt: null,
      updatedAt: { gt: new Date(Date.now() - WINDOW_MS) },
      OR: [
        { status: { in: ['COMPLETED', 'REFUNDED', 'FAILED'] } },
        { dstSwapTxHash: { not: null } },
      ],
    },
    select: {
      id: true,
      userId: true,
      direction: true,
      status: true,
      dstAsset: true,
      dstAmount: true,
      dstSwapTxHash: true,
    },
    orderBy: { updatedAt: 'asc' },
    take: BATCH,
  });
  counts.scanned = rows.length;

  const delivering: CctpRow[] = [];
  for (const row of rows) {
    const verdict = cctpTerminalKind(row);
    if (!verdict) {
      counts.skipped += 1; // outbound COMPLETED = Base mint only, nothing to say yet
      continue;
    }
    if (verdict === 'delivering') {
      delivering.push(row);
      continue;
    }
    await claimAndSendCctp(row, verdict, counts);
  }

  // Outbound pivots: dstSwapTxHash is the BROADCAST on Base; LI.FI decides
  // whether the asset actually landed (DONE), came back (REFUNDED) or died.
  await inChunks(delivering, LIFI_LOOKUP_CONCURRENCY, async (row) => {
    const status = await lookupLifiStatusByChainIds(
      row.dstSwapTxHash as string,
      BASE_CHAIN_ID,
      lifiChainIdForSymbol(row.dstAsset),
      LIFI_LOOKUP_TIMEOUT_MS
    );
    if (status === 'DONE') await claimAndSendCctp(row, 'completed', counts);
    else if (status === 'REFUNDED') await claimAndSendCctp(row, 'refunded', counts);
    else if (status === 'FAILED') await claimAndSendCctp(row, 'failed', counts);
    else counts.skipped += 1; // PENDING / NOTFOUND: ask again next tick
  });
  return counts;
}

// ----- ETH / SOL sends --------------------------------------------------------

function ownerKey(chain: ChainId, address: string): string {
  return getChain(chain).kind === 'evm'
    ? `${chain}:${address.toLowerCase()}`
    : `${chain}:${address}`;
}

/**
 * walletAddress → supabaseUid via the registry's address column, one query
 * per chain. EVM addresses are compared case-insensitively (checksum casing
 * varies by writer); Solana and Stellar addresses are case-sensitive
 * encodings, so exact match — cheaper and correct.
 */
async function ownersByAddress(
  pairs: { chain: ChainId; address: string }[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const byChain = new Map<ChainId, string[]>();
  for (const p of pairs) byChain.set(p.chain, [...(byChain.get(p.chain) ?? []), p.address]);
  for (const [chain, addresses] of byChain) {
    const def = getChain(chain);
    const field = def.addressField;
    const where =
      def.kind === 'evm'
        ? { OR: addresses.map((a) => ({ [field]: { equals: a, mode: 'insensitive' as const } })) }
        : { [field]: { in: addresses } };
    const rows = await prisma.turnkeyWallet.findMany({
      where,
      select: { supabaseUid: true, [field]: true },
    });
    for (const r of rows) {
      const addr = (r as Record<string, string | null>)[field];
      if (addr) out.set(ownerKey(chain, addr), r.supabaseUid);
    }
  }
  return out;
}

export async function notifySettledSends(): Promise<SweepCounts> {
  const counts = zero();
  if (!pushActive()) return counts;
  const rows = await prisma.sendLog.findMany({
    where: {
      notifiedAt: null,
      txHash: { not: null },
      status: { in: ['confirmed', 'failed', 'abandoned'] },
      createdAt: { gt: new Date(Date.now() - WINDOW_MS) },
    },
    select: {
      id: true,
      walletAddress: true,
      chain: true,
      symbol: true,
      amount: true,
      status: true,
      txHash: true,
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH,
  });
  counts.scanned = rows.length;
  if (!rows.length) return counts;

  const owners = await ownersByAddress(
    rows
      .filter((r) => isChainId(r.chain))
      .map((r) => ({ chain: r.chain as ChainId, address: r.walletAddress }))
  );

  for (const row of rows) {
    const kind = sendTerminalKind(row.status);
    const uid = isChainId(row.chain)
      ? owners.get(ownerKey(row.chain, row.walletAddress))
      : undefined;
    if (!kind || !uid) {
      // Unknown owner (not a primary Turnkey address) or unknown chain: mark
      // so it is never re-scanned; there is nobody to notify.
      await prisma.sendLog.updateMany({
        where: { id: row.id, notifiedAt: null },
        data: { notifiedAt: new Date() },
      });
      counts.skipped += 1;
      continue;
    }
    const claimed = await prisma.sendLog.updateMany({
      where: { id: row.id, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });
    if (claimed.count !== 1) continue;
    const payload = buildSendPayload(row, kind, getChain(row.chain as ChainId).name, opts());
    if (!payload) continue;
    const outcome = await sendPush({ supabaseUid: uid, payload });
    if (shouldUnclaim(outcome)) {
      await prisma.sendLog.updateMany({ where: { id: row.id }, data: { notifiedAt: null } });
      counts.retried += 1;
      continue;
    }
    counts.notified += 1;
  }
  return counts;
}

// ----- LI.FI native swaps ---------------------------------------------------------

export async function notifyLifiSwaps(): Promise<SweepCounts & { checked: number }> {
  const counts = { ...zero(), checked: 0 };
  if (!pushActive()) return counts;
  const rows = await prisma.swapLog.findMany({
    where: {
      bridgeStatus: 'PENDING',
      txHash: { not: null },
      createdAt: { gt: new Date(Date.now() - LIFI_WINDOW_MS) },
    },
    select: {
      id: true,
      walletAddress: true,
      txHash: true,
      tokenInSymbol: true,
      tokenOutSymbol: true,
      amountOut: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 25,
  });
  counts.scanned = rows.length;
  if (!rows.length) return counts;

  // LI.FI rows are keyed by the user's Stellar address (api/lifi/record).
  const owners = await ownersByAddress(
    rows.map((r) => ({ chain: 'stellar' as ChainId, address: r.walletAddress }))
  );

  // Bounded parallelism: 25 sequential 15 s lookups would exceed the cron budget.
  const looked = await inChunks(rows, LIFI_LOOKUP_CONCURRENCY, async (row) => ({
    row,
    status: await lookupLifiStatus(
      row.txHash as string,
      row.tokenInSymbol ?? '',
      row.tokenOutSymbol ?? '',
      LIFI_LOOKUP_TIMEOUT_MS
    ),
  }));
  counts.checked = looked.length;

  for (const { row, status } of looked) {
    // NOTFOUND is LI.FI indexing lag or an outage — /api/lifi/record is only
    // called after the source tx confirmed — so it is never turned into
    // FAILED here. PENDING rows simply age out of the 24h window.
    if (!isLifiTerminal(status)) {
      await prisma.swapLog.update({ where: { id: row.id }, data: { bridgeCheckedAt: new Date() } });
      continue;
    }
    await prisma.swapLog.update({
      where: { id: row.id },
      data: { bridgeStatus: status, bridgeCheckedAt: new Date() },
    });
    const claimed = await prisma.swapLog.updateMany({
      where: { id: row.id, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });
    if (claimed.count !== 1) continue;
    const uid = owners.get(ownerKey('stellar', row.walletAddress));
    const payload = buildLifiPayload(row, status, opts());
    if (!uid || !payload) {
      counts.skipped += 1;
      continue;
    }
    const outcome = await sendPush({ supabaseUid: uid, payload });
    if (shouldUnclaim(outcome)) {
      await prisma.swapLog.updateMany({ where: { id: row.id }, data: { notifiedAt: null } });
      counts.retried += 1;
      continue;
    }
    counts.notified += 1;
  }
  return counts;
}

// ----- All three, never throwing into the cron ---------------------------------

export async function runPushSweeps(): Promise<{
  cctp: SweepCounts | { error: string };
  sends: SweepCounts | { error: string };
  lifi: (SweepCounts & { checked: number }) | { error: string };
  active: boolean;
}> {
  const guard = async <T>(label: string, fn: () => Promise<T>): Promise<T | { error: string }> => {
    try {
      return await fn();
    } catch (e) {
      logger.error(`[push] sweep ${label} failed`, e);
      return { error: String((e as Error)?.message ?? e).slice(0, 200) };
    }
  };
  return {
    cctp: await guard('cctp', notifyTerminalCctp),
    sends: await guard('sends', notifySettledSends),
    lifi: await guard('lifi', notifyLifiSwaps),
    active: pushActive(),
  };
}

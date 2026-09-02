// ---------------------------------------------------------------------------
// Reconciling "Your Deposits" (#55).
//
// totalDeposited is computed from DeFindex's per-wallet event history, whose
// indexer runs 30-120s behind the chain. Reading it immediately after a
// deposit/withdraw therefore captures a HALF-INDEXED world — observed live
// (2026-08-10): a rapid withdraw→deposit read the events between the two,
// producing 18.455 instead of 23.430, and the snapshot was then cached for
// 300s, locking the wrong figure on screen. The gap surfaced as fake
// "earnings" because earnings = currentValue (live) − totalDeposited (stale).
//
// The fix is a signal, not a timer: every deposit/withdraw we execute is
// logged to `vault_deposits` WITH its transaction hash within a second of
// succeeding. So the events total is merged with our own recent rows BY HASH:
// a row whose tx the indexer hasn't caught up to yet contributes its delta;
// the moment the event appears, the hash matches and the row steps aside.
// The merged figure is correct at every instant regardless of indexer or
// cache staleness, and converges automatically — nothing to expire, nothing
// to guess.
// ---------------------------------------------------------------------------

export interface PendingLedgerRow {
  type: string; // 'deposit' | 'withdraw'
  amount: string; // human-readable USDC
  txHash: string | null;
  createdAt: Date | string;
  // #27: rows exist before broadcast. The route already filters its query to
  // confirmed rows; this is defense-in-depth for any future caller.
  status?: string;
}

// Rows older than this cannot be "the indexer hasn't seen it yet" — real lag
// is 30-120s; 24h is a ~700x safety margin. Bounding the window means a row
// whose tx never reached the indexer (e.g. logged for a tx that later proved
// bogus) cannot skew the figure forever.
export const PENDING_ROW_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Events-derived total + deltas of our own recent rows the indexer has not
 * yet included (matched by tx hash). Pure — pinned by savings-deposits.test.
 */
export function reconcileTotalDeposited(params: {
  eventsTotal: number;
  eventTxIds: Iterable<string>;
  rows: PendingLedgerRow[];
  nowMs: number;
  windowMs?: number;
}): { total: number; pendingCount: number } {
  const { eventsTotal, eventTxIds, rows, nowMs, windowMs = PENDING_ROW_WINDOW_MS } = params;

  const indexed = new Set(eventTxIds);
  const counted = new Set<string>();
  let delta = 0;
  let pendingCount = 0;

  for (const row of rows) {
    // Only money that actually moved may count (#27).
    if (row.status !== undefined && row.status !== 'confirmed') continue;
    // No hash = no way to ever match it against an event, so adding it could
    // only double-count once the indexer catches up. Skip.
    if (!row.txHash) continue;
    if (indexed.has(row.txHash) || counted.has(row.txHash)) continue;

    const createdMs = new Date(row.createdAt).getTime();
    if (!Number.isFinite(createdMs) || nowMs - createdMs > windowMs) continue;

    const amount = parseFloat(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    if (row.type === 'deposit') delta += amount;
    else if (row.type === 'withdraw') delta -= amount;
    else continue;

    counted.add(row.txHash);
    pendingCount += 1;
  }

  return { total: Math.max(eventsTotal + delta, 0), pendingCount };
}

/** Tx hash of a DeFindex event, tolerant to the shapes the API has used. */
export function eventTxId(event: unknown): string | null {
  const e = event as { transactionId?: string; txHash?: string; transaction_hash?: string };
  return e?.transactionId ?? e?.txHash ?? e?.transaction_hash ?? null;
}

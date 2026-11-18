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

// ---------------------------------------------------------------------------
// "You put in" is the money still invested, not deposits minus withdrawals.
//
// A withdrawal pays out yield as well as principal, so subtracting its full
// amount treats that yield as the user's own money: "put in" drops below what
// is really invested and "earned" counts yield that was already paid out.
// Live 2026-11-14 (a partner's account): deposits of 749.98, a full withdrawal
// of 762.67 (12.69 of it yield), a new deposit of 497.50. Deposits minus
// withdrawals said 484.81 put in and 12.87 earned; the truth was 497.50 and
// 0.18. Earnings set the withdrawal commission (getYieldCommission), so every
// saver who had ever withdrawn was overcharged on a device without a cached
// figure (5 of 14 savers that day, up to 35.54 USDC on a full withdrawal).
//
// Average cost instead: a deposit adds its USDC and its vault shares; a
// withdrawal removes the same FRACTION of the principal as of the shares it
// burns. A full withdrawal leaves exactly 0, and the yield it paid out never
// counts again.
// ---------------------------------------------------------------------------

/** USDC and vault-share amounts in DeFindex events are 7-decimal integers. */
const EVENT_DECIMALS = 1e7;

interface ParsedEvent {
  type: 'deposit' | 'withdraw';
  /** USDC moved, human units. */
  usdc: number;
  /** Vault shares minted or burned (raw units: only their ratio is used). */
  shares: number | null;
  /** Chain order: ledger, else time. Null when the event carries neither. */
  order: number | null;
}

function parseEvent(raw: unknown): ParsedEvent | null {
  const e = raw as {
    eventType?: string;
    type?: string;
    amount?: unknown;
    assetAmount?: unknown;
    assets?: { amount?: unknown }[];
    underlyingAmount?: unknown;
    dfTokenAmount?: unknown;
    ledger?: unknown;
    timestamp?: unknown;
  };
  const type = String(e?.eventType ?? e?.type ?? '').toLowerCase();
  if (type !== 'deposit' && type !== 'withdraw') return null;
  // Verified against live responses 2026-08-10: assets[0].amount is USDC for
  // both directions; dfTokenAmount carries the shares.
  const usdc =
    (Number(e.amount ?? e.assetAmount ?? e.assets?.[0]?.amount ?? e.underlyingAmount ?? 0) || 0) /
    EVENT_DECIMALS;
  const sharesRaw = Number(e.dfTokenAmount);
  const ledger = Number(e.ledger);
  const time = typeof e.timestamp === 'string' ? Date.parse(e.timestamp) : NaN;
  return {
    type,
    usdc: Math.max(usdc, 0),
    shares: Number.isFinite(sharesRaw) && sharesRaw > 0 ? sharesRaw : null,
    order: Number.isFinite(ledger) && ledger > 0 ? ledger : Number.isFinite(time) ? time : null,
  };
}

const round7 = (n: number) => Math.round(n * EVENT_DECIMALS) / EVENT_DECIMALS;

/**
 * The principal still invested, from the vault's per-wallet event history
 * (any order; the API lists newest first). Null when there is no history.
 *
 * Falls back to the old deposits-minus-withdrawals rule only where the
 * average cost cannot be computed: for the whole history if any event lacks
 * an order (a withdrawal's fraction depends on what came before it), and for
 * a single withdrawal that carries no share amount.
 */
export function principalFromEvents(events: readonly unknown[]): number | null {
  if (!Array.isArray(events) || events.length === 0) return null;
  const parsed = events.map(parseEvent).filter((e): e is ParsedEvent => e !== null);
  if (parsed.length === 0) return null;

  if (parsed.some((e) => e.order === null)) {
    const net = parsed.reduce((sum, e) => sum + (e.type === 'deposit' ? e.usdc : -e.usdc), 0);
    return round7(Math.max(net, 0));
  }

  // Two events in one ledger: the API lists newest first, so the later index
  // is the earlier event.
  const ordered = parsed
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.order as number) - (b.e.order as number) || b.i - a.i)
    .map(({ e }) => e);

  let principal = 0;
  let shares = 0;
  for (const e of ordered) {
    if (e.type === 'deposit') {
      principal += e.usdc;
      if (e.shares !== null) shares += e.shares;
    } else if (e.shares !== null && shares > 0) {
      principal -= principal * Math.min(e.shares / shares, 1);
      shares = Math.max(shares - e.shares, 0);
    } else {
      principal -= e.usdc;
    }
    principal = Math.max(principal, 0);
  }
  return round7(principal);
}

/**
 * Events-derived total + deltas of our own recent rows the indexer has not
 * yet included (matched by tx hash). Pure — pinned by savings-deposits.test.
 *
 * With `currentValue` (the vault balance now, after every pending row), a
 * pending withdrawal removes its fraction of the principal, the same average
 * cost rule as principalFromEvents. Without it, its full amount (legacy).
 */
export function reconcileTotalDeposited(params: {
  eventsTotal: number;
  eventTxIds: Iterable<string>;
  rows: PendingLedgerRow[];
  nowMs: number;
  windowMs?: number;
  currentValue?: number;
}): { total: number; pendingCount: number } {
  const {
    eventsTotal,
    eventTxIds,
    rows,
    nowMs,
    windowMs = PENDING_ROW_WINDOW_MS,
    currentValue,
  } = params;

  const indexed = new Set(eventTxIds);
  const counted = new Set<string>();
  const pending: { type: 'deposit' | 'withdraw'; amount: number; createdMs: number }[] = [];

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
    if (row.type !== 'deposit' && row.type !== 'withdraw') continue;

    pending.push({ type: row.type, amount, createdMs });
    counted.add(row.txHash);
  }

  const pendingCount = pending.length;
  const hasValue = typeof currentValue === 'number' && Number.isFinite(currentValue);
  if (!hasValue) {
    const delta = pending.reduce((d, p) => d + (p.type === 'deposit' ? p.amount : -p.amount), 0);
    return { total: Math.max(eventsTotal + delta, 0), pendingCount };
  }

  // Walk the pending rows in time order from the vault value BEFORE them.
  pending.sort((a, b) => a.createdMs - b.createdMs);
  let value = pending.reduce(
    (v, p) => v + (p.type === 'withdraw' ? p.amount : -p.amount),
    Math.max(currentValue as number, 0)
  );
  let principal = Math.max(eventsTotal, 0);
  for (const p of pending) {
    if (p.type === 'deposit') {
      principal += p.amount;
      value += p.amount;
    } else {
      principal -= value > 0 ? principal * Math.min(p.amount / value, 1) : p.amount;
      value -= p.amount;
    }
    principal = Math.max(principal, 0);
  }
  return { total: principal, pendingCount };
}

/**
 * "Your Deposits" when there's no event history to reconcile against: the
 * events API returned nothing or couldn't be read. Our recorded rows may miss
 * deposits made before #27 or outside the app, and earnings are what's in the
 * vault minus this figure, so a partial sum would invent earnings and overcharge
 * the yield commission on the next withdrawal. Never less than the vault value,
 * then: no earnings until the history is readable (security report, 2026-11-04).
 */
export function totalDepositedWithoutHistory(
  rows: Pick<PendingLedgerRow, 'type' | 'amount'>[],
  vaultValue: number
): number {
  const recorded = rows.reduce((sum, row) => {
    const amount = parseFloat(row.amount) || 0;
    if (row.type === 'deposit') return sum + amount;
    if (row.type === 'withdraw') return sum - amount;
    return sum;
  }, 0);
  return Math.max(recorded, vaultValue, 0);
}

/** Tx hash of a DeFindex event, tolerant to the shapes the API has used. */
export function eventTxId(event: unknown): string | null {
  const e = event as { transactionId?: string; txHash?: string; transaction_hash?: string };
  return e?.transactionId ?? e?.txHash ?? e?.transaction_hash ?? null;
}

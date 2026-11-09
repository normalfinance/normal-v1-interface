// ---------------------------------------------------------------------------
// The crypto index's legs: the pure decisions (server/index-legs.ts does the
// I/O). A leg is one coin of a purchase: its share of the USDC Circle minted
// to the person's own Base address, swapped by Autopilot into that coin.
// ---------------------------------------------------------------------------

/** The CctpTransfer direction of an index purchase (never pivoted whole). */
export const INDEX_DIRECTION = 'stellar_to_index';
/** The purchase row's dstAsset: it is many coins, not one. */
export const INDEX_DST_ASSET = 'INDEX';

export type LegStatus = 'PENDING' | 'SWAPPING' | 'SENT' | 'HELD';

/** Attempts per leg before it stops retrying and holds the USDC (safe, at home). */
export const LEG_MAX_ATTEMPTS = 4;

/** A claim older than this was a crashed run: the leg may be picked up again. */
export const LEG_CLAIM_STALE_MS = 5 * 60_000;

/**
 * The cron leaves a fresh leg to the open page: the page asks the server to
 * finish the moment the mint lands, and the cron is the closed-tab fallback.
 */
export const LEG_CRON_IDLE_MS = 2 * 60_000;

export interface LegView {
  id: string;
  status: string;
  dstSwapTxHash: string | null;
  retryCount: number;
  updatedAt: Date;
}

/** May this leg be worked on now? (`now` in ms.) */
export function legRunnable(leg: LegView, now: number): boolean {
  if (leg.dstSwapTxHash) return false; // its swap is out: never a second one
  if (leg.retryCount >= LEG_MAX_ATTEMPTS) return false;
  if (leg.status === 'PENDING') return true;
  if (leg.status === 'SWAPPING') return now - leg.updatedAt.getTime() > LEG_CLAIM_STALE_MS;
  return false;
}

/** Where a failed attempt leaves the leg: retry later, or hold the USDC. */
export function statusAfterFailure(retryCountAfterClaim: number): LegStatus {
  return retryCountAfterClaim >= LEG_MAX_ATTEMPTS ? 'HELD' : 'PENDING';
}

export interface PurchaseRow {
  direction: string;
  status: string;
  burnTxHash: string | null;
  mintTxHash: string | null;
}

/** Circle has released the USDC on Base, so the legs can be bought. */
export function purchaseReadyForLegs(row: PurchaseRow): boolean {
  return (
    row.direction === INDEX_DIRECTION &&
    !!row.burnTxHash &&
    !!row.mintTxHash &&
    row.status !== 'FAILED' &&
    row.status !== 'REFUNDED'
  );
}

/** How the whole purchase reads, from its row and its legs. */
export type PurchasePhase =
  | 'record' // created, nothing signed yet
  | 'bridging' // burned on Stellar, Circle is moving it
  | 'buying' // on Base, legs being bought
  | 'delivering' // every leg's swap is out, bridges deliver
  | 'held' // at least one leg gave up: its USDC is at the person's own Base address
  | 'failed';

export function purchasePhase(row: PurchaseRow, legs: { status: string }[]): PurchasePhase {
  if (row.status === 'FAILED' || row.status === 'REFUNDED') return 'failed';
  if (!row.burnTxHash) return 'record';
  if (!row.mintTxHash) return 'bridging';
  if (legs.some((l) => l.status === 'HELD')) return 'held';
  if (legs.length && legs.every((l) => l.status === 'SENT')) return 'delivering';
  return 'buying';
}

import { BigNumber } from 'bignumber.js';

// ---------------------------------------------------------------------------
// Doc 95 Wave 6 — a LI.FI quote is not just a price.
//
// It carries a BUILT transactionRequest. For Bitcoin that is a Chainflip
// deposit CHANNEL, which expires; for EVM routes the calldata usually carries
// its own deadline. So executing an old quote is not "getting a slightly stale
// price" — it can mean sending coins to an address that no longer routes
// anywhere, with nothing to refund and no bridge to fail over from.
//
// The engine used to keep whatever quote it last fetched and execute it
// whenever the user pressed Swap, however long the card had been open.
// ---------------------------------------------------------------------------

/** How long a built quote may sit before it has to be fetched again. */
export const QUOTE_STALE_MS = 10 * 60_000;

/**
 * How far the output may drop on a silent re-quote before we stop and ask.
 * Below this we re-price without interrupting: the user asked for a swap and
 * a fraction of a percent is ordinary movement, not a different deal.
 */
export const MATERIAL_DRIFT = 0.01;

/** Unknown age counts as stale: never execute a quote we cannot date. */
export function isQuoteStale(ageMs: number): boolean {
  if (!Number.isFinite(ageMs)) return true;
  return ageMs >= QUOTE_STALE_MS;
}

export type DriftVerdict = 'ok' | 'worse';

/**
 * Compare the output the user was shown with the one a fresh quote offers.
 * Only a materially WORSE number needs permission — same or better is the
 * deal they already accepted, and interrupting for it would train people to
 * click through the dialog that exists to protect them.
 */
export function driftVerdict(
  shownOut: BigNumber.Value | null | undefined,
  freshOut: BigNumber.Value | null | undefined
): DriftVerdict {
  if (shownOut == null || freshOut == null) return 'worse';
  const shown = BigNumber(shownOut);
  const fresh = BigNumber(freshOut);
  // An uncomparable pair is not evidence of a good deal — ask.
  if (!shown.isFinite() || !fresh.isFinite() || shown.lte(0)) return 'worse';
  if (fresh.gte(shown)) return 'ok';
  return shown.minus(fresh).dividedBy(shown).gt(MATERIAL_DRIFT) ? 'worse' : 'ok';
}

// Doc 95 Wave 3: how much of a Base USDC balance belongs to THIS transfer.
//
// THE LIVE BUG (2026-08-26, real user funds): the burn and pivot legs both
// moved the address's WHOLE balance. When two swaps land close together the
// first row's burn swept the second row's minted USDC — measured on-chain:
// a row quoting 16.75 USDC burned 32.40, and its sibling (15.45 USDC) was
// left permanently stuck in CREATED with nothing to burn. No money was lost
// — it all reached the same user — but one transfer can never complete and
// the amounts are attributed to the wrong rows.
//
// The opposite bug lived on the client: it clamped to the quoted minimum
// exactly, leaving positive slippage stranded on Base forever.
//
// ONE rule for both: take what this row is owed, plus a slippage allowance,
// and never more than what is actually there.

/** Headroom over the quoted amount, to absorb positive slippage (the route
 *  usually delivers a little MORE than the quoted minimum). 5%. */
const SLIPPAGE_HEADROOM_DIVISOR = 20n;

/**
 * @param available  balance actually sitting at the address (wire units)
 * @param expected   what this transfer quoted (wire units); 0/absent means
 *                   "this row is a sweep" (refunds) — take everything
 */
export function scopedAmountWire(available: bigint, expected: bigint): bigint {
  if (available <= 0n) return 0n;
  // A refund/sweep row carries no meaningful quote: recover the lot.
  if (expected <= 0n) return available;
  const cap = expected + expected / SLIPPAGE_HEADROOM_DIVISOR;
  return available > cap ? cap : available;
}

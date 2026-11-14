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
/**
 * Have a swap's digital dollars reached the Base address? The live swap's own
 * arrival rule (95% of the quoted minimum), read without its starting balance:
 * a few cents left over from an earlier swap must not count as this one
 * arriving. Counting dust as arrived would burn the dust for this swap and
 * strand its real digital dollars when they land.
 */
export function arrivedAtBase(available: bigint, expected: bigint): boolean {
  if (available <= 0n) return false;
  if (expected <= 0n) return true;
  return available * 100n >= expected * 95n;
}

/**
 * One index leg's USDC: exactly its share, or what is left when less.
 *
 * No slippage headroom, unlike scopedAmountWire: the legs of one purchase
 * share ONE Base balance that Circle minted to the cent (the shares add up to
 * it), so 5% extra for one leg is 5% taken from the legs after it. Live
 * 2026-11-11 (a 410 USDC Top 3 purchase): the BTC leg swapped 357.4872 of its
 * 340.464 share, ETH got the 52.5128 left of its 58.056, and SOL found nothing
 * and was held. No share, nothing taken: a leg never sweeps the balance.
 */
export function legAmountWire(available: bigint, share: bigint): bigint {
  if (available <= 0n || share <= 0n) return 0n;
  return available < share ? available : share;
}

export function scopedAmountWire(available: bigint, expected: bigint): bigint {
  if (available <= 0n) return 0n;
  // A refund/sweep row carries no meaningful quote: recover the lot.
  if (expected <= 0n) return available;
  const cap = expected + expected / SLIPPAGE_HEADROOM_DIVISOR;
  return available > cap ? cap : available;
}

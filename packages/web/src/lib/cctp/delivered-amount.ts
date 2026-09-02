// Doc 95 Wave 5: turn a bridge's "this is what the destination received" into
// a human amount.
//
// WHY IT MATTERS: we used to record the quote's guaranteed MINIMUM and then
// forbid it from ever being replaced, so Activity and the Dune dashboard
// under-reported every cross-chain swap by its slippage. This reads the truth
// instead — and returns null rather than a guess whenever the payload is not
// something we can trust, because a wrong number is worse than a missing one.

import { BigNumber } from 'bignumber.js';

export interface ReceivingLike {
  amount?: unknown;
  token?: { decimals?: unknown } | null;
}

/** Human-readable delivered amount, or null when it cannot be trusted. */
export function parseDeliveredAmount(receiving: ReceivingLike | null | undefined): string | null {
  if (!receiving || receiving.amount == null) return null;
  const raw = String(receiving.amount);
  // Base units are integers. Anything else (scientific notation, a float, a
  // stray symbol) means we are not reading what we think we are.
  if (!/^\d+$/.test(raw)) return null;
  const decimals = Number(receiving.token?.decimals);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) return null;
  const value = BigNumber(raw).dividedBy(BigNumber(10).pow(decimals));
  if (!value.isFinite() || value.lte(0)) return null;
  return value.toFixed();
}

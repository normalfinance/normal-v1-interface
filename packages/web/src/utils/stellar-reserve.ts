import { BigNumber } from 'bignumber.js';

// ---------------------------------------------------------------------------
// Single source of truth for how much XLM an account can actually send.
//
// Stellar locks a minimum balance = (2 + subentryCount) × baseReserve; a payment
// can never drop the account below it (op_underfunded). So the real max send is
// balance − minimum reserve − network fee. The send modal (MAX + validation) and
// the send execution both derive from here, so they can never disagree.
// ---------------------------------------------------------------------------

export const STELLAR_BASE_RESERVE = 0.5;
/** Fixed 2000-stroop network fee (0.0002 XLM) used when building the payment. */
export const STELLAR_TX_FEE_XLM = 0.0002;

// Extra XLM kept back from EVERY outflow (send + swap, MAX and typed) while
// the user has an active savings position, so future Soroban deposit/withdraw
// fees can always be paid. Was a MAX-only nicety until finding #67: typing an
// amount bypassed it, and swaps never applied it at all — a saver could move
// out every last XLM and strand their own savings.
export const SAVINGS_XLM_BUFFER = 1;

/** Minimum XLM balance the account must keep to stay valid on-chain. */
export function stellarMinReserve(subentryCount: number): BigNumber {
  return BigNumber(2 + Math.max(subentryCount, 0)).multipliedBy(STELLAR_BASE_RESERVE);
}

/** Max XLM that can actually be sent: balance − minimum reserve − network fee. */
export function spendableXlm(balance: BigNumber.Value, subentryCount: number): BigNumber {
  return BigNumber.max(
    BigNumber(balance).minus(stellarMinReserve(subentryCount)).minus(STELLAR_TX_FEE_XLM),
    0
  );
}

// Minimum spendable XLM (above the account reserve) needed to safely pay the
// Soroban fees of a savings deposit/withdrawal. Below this we warn the user that
// they need to top up XLM before they can move money in/out of savings.
export const MIN_XLM_FOR_SAVINGS_TX = 0.5;

/** XLM available (above the minimum reserve) to spend on network/Soroban fees. */
export function xlmAvailableForFees(xlmBalance: BigNumber.Value, subentryCount = 1): BigNumber {
  return BigNumber.max(BigNumber(xlmBalance).minus(stellarMinReserve(subentryCount)), 0);
}

/**
 * Spendable XLM for an OUTFLOW (send or swap). On top of the network reserve
 * and tx fee, an active savings position holds back SAVINGS_XLM_BUFFER so the
 * user can never move out the XLM their future withdrawal fees need (#67).
 * Callers decide `hasActiveSavings` (position > 0; while the position is still
 * loading, MAX-style callers may pass their conservative fallback).
 */
export function spendableXlmForOutflow(
  balance: BigNumber.Value,
  subentryCount: number,
  hasActiveSavings: boolean
): BigNumber {
  const base = spendableXlm(balance, subentryCount);
  return hasActiveSavings ? BigNumber.max(base.minus(SAVINGS_XLM_BUFFER), 0) : base;
}

// ---------------------------------------------------------------------------
// XLM fee semaphore (#67): the always-visible traffic light on the savings
// surfaces. Thresholds reuse the two existing constants so the light, the
// outflow guard and the savings action-block can never disagree:
//   blocked (red)  fee-available < MIN_XLM_FOR_SAVINGS_TX — cannot even pay
//                  one savings action's fees (the savings card blocks actions
//                  at exactly this line)
//   low (yellow)   enough for roughly one action, below the guard's buffer —
//                  works today, one fee spike from red
//   ok (green)     at or above SAVINGS_XLM_BUFFER — the state the outflow
//                  guard maintains for savers
// ---------------------------------------------------------------------------
export type XlmFeeStatus = 'ok' | 'low' | 'blocked';

export function xlmFeeStatus(xlmBalance: BigNumber.Value, subentryCount = 1): XlmFeeStatus {
  const available = xlmAvailableForFees(xlmBalance, subentryCount);
  if (available.lt(MIN_XLM_FOR_SAVINGS_TX)) return 'blocked';
  if (available.lt(SAVINGS_XLM_BUFFER)) return 'low';
  return 'ok';
}

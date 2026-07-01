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

// Extra XLM kept back on MAX for accounts that use savings, so future Soroban
// deposit/withdraw fees can always be paid. This is a MAX-only nicety — a manual
// send can still go all the way down to the network reserve.
export const SAVINGS_XLM_BUFFER = 1;

/** Minimum XLM balance the account must keep to stay valid on-chain. */
export function stellarMinReserve(subentryCount: number): BigNumber {
  return BigNumber(2 + Math.max(subentryCount, 0)).multipliedBy(STELLAR_BASE_RESERVE);
}

/** Max XLM that can actually be sent: balance − minimum reserve − network fee. */
export function spendableXlm(balance: BigNumber.Value, subentryCount: number): BigNumber {
  return BigNumber.max(
    BigNumber(balance).minus(stellarMinReserve(subentryCount)).minus(STELLAR_TX_FEE_XLM),
    0,
  );
}

// Minimum spendable XLM (above the account reserve) needed to safely pay the
// Soroban fees of a savings deposit/withdrawal. Below this we warn the user that
// they need to top up XLM before they can move money in/out of savings.
export const MIN_XLM_FOR_SAVINGS_TX = 0.5;

/** XLM available (above the minimum reserve) to spend on network/Soroban fees. */
export function xlmAvailableForFees(
  xlmBalance: BigNumber.Value,
  subentryCount = 1,
): BigNumber {
  return BigNumber.max(BigNumber(xlmBalance).minus(stellarMinReserve(subentryCount)), 0);
}

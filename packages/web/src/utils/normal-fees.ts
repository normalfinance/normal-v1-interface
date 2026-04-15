/**
 * Normal Finance fee structure — pure math helpers safe for client and server.
 * All amounts are human-readable (USDC / XLM), NOT stroops.
 */

// ----------------------------------------------------------------------
// Savings deposit flat fee (USDC)
// x < 200    → $0.99
// 200 ≤ x < 500 → $1.99
// x ≥ 500    → $2.99

export const SAVINGS_DEPOSIT_FEE_LOW = 0.99;
export const SAVINGS_DEPOSIT_FEE_MID = 1.99;
export const SAVINGS_DEPOSIT_FEE_HIGH = 2.99;
export const SAVINGS_DEPOSIT_TIER_MID_MIN = 200;
export const SAVINGS_DEPOSIT_TIER_HIGH_MIN = 500;

export function getSavingsDepositFee(amountUsd: number): number {
  if (amountUsd >= SAVINGS_DEPOSIT_TIER_HIGH_MIN) return SAVINGS_DEPOSIT_FEE_HIGH;
  if (amountUsd >= SAVINGS_DEPOSIT_TIER_MID_MIN) return SAVINGS_DEPOSIT_FEE_MID;
  return SAVINGS_DEPOSIT_FEE_LOW;
}

// ----------------------------------------------------------------------
// Swap fee — 0.5% on tokenIn

export const SWAP_FEE_BPS = 50;
export const SWAP_FEE_RATE = SWAP_FEE_BPS / 10_000;

export function getSwapFeeAmount(amountIn: number): number {
  if (!Number.isFinite(amountIn) || amountIn <= 0) return 0;
  return amountIn * SWAP_FEE_RATE;
}

// ----------------------------------------------------------------------
// Yield commission — 7% on realized yield at withdrawal

export const YIELD_COMMISSION_BPS = 700;
export const YIELD_COMMISSION_RATE = YIELD_COMMISSION_BPS / 10_000;

/**
 * Compute the commission owed on a partial withdrawal.
 * The proportional yield in a withdrawal is
 *   yieldPortion = withdrawAmount * (earnings / currentValue)
 * and the commission is 7% of that.
 */
export function getYieldCommission(params: {
  withdrawAmount: number;
  currentValue: number;
  earnings: number;
}): number {
  const { withdrawAmount, currentValue, earnings } = params;
  if (withdrawAmount <= 0 || currentValue <= 0 || earnings <= 0) return 0;
  const yieldRatio = earnings / currentValue;
  const yieldPortion = withdrawAmount * yieldRatio;
  return yieldPortion * YIELD_COMMISSION_RATE;
}

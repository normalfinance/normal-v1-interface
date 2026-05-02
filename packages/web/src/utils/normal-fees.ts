/**
 * Normal Finance fee structure — pure math helpers safe for client and server.
 * All amounts are human-readable (USDC / XLM), NOT stroops.
 */

// ----------------------------------------------------------------------
// Savings deposit fee — 0.5% of the deposit amount

export const SAVINGS_DEPOSIT_FEE_BPS = 50;
export const SAVINGS_DEPOSIT_FEE_RATE = SAVINGS_DEPOSIT_FEE_BPS / 10_000;

export function getSavingsDepositFee(amountUsd: number): number {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return 0;
  return amountUsd * SAVINGS_DEPOSIT_FEE_RATE;
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
// Yield commission — tiered by withdrawal amount (USDC)
// 0–499 → 20% | 500–2,499 → 15% | 2,500–50,000 → 10% | 50,000+ → 5%

export const YIELD_COMMISSION_TIERS: ReadonlyArray<{ minUsd: number; rate: number }> = [
  { minUsd: 50_000, rate: 0.05 },
  { minUsd: 2_500, rate: 0.10 },
  { minUsd: 500, rate: 0.15 },
  { minUsd: 0, rate: 0.20 },
];

export function getYieldCommissionRate(withdrawAmountUsd: number): number {
  if (!Number.isFinite(withdrawAmountUsd) || withdrawAmountUsd <= 0) return 0.20;
  for (const tier of YIELD_COMMISSION_TIERS) {
    if (withdrawAmountUsd >= tier.minUsd) return tier.rate;
  }
  return 0.20;
}

/**
 * Compute the commission owed on a partial withdrawal.
 * The proportional yield in a withdrawal is
 *   yieldPortion = withdrawAmount * (earnings / currentValue)
 * and the commission is the tier rate (5%–20%) of that.
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
  return yieldPortion * getYieldCommissionRate(withdrawAmount);
}

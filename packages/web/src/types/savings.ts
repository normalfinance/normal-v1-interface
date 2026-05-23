// Savings types for DeFindex integration

export interface VaultInfo {
  address: string;
  name: string;
  symbol?: string;
  totalDeposits: string; // current TVL from totalManagedFunds
  totalDeposited: string; // cumulative deposits through Normal from DeFindex history metrics
  apy: number;
  asset: string; // USDC
  fees?: { vaultFee: number; defindexFee: number };
}

export interface SavingsPosition {
  shares: string; // dfTokens
  currentValue: string; // underlying asset value
  totalDeposited: string; // net deposits from DB (deposits - withdrawals)
  earnings: string; // current earnings: currentValue - totalDeposited (resets to 0 after full withdrawal)
  lifetimeEarnings?: string; // all-time earnings: totalInterestEarned from DeFindex API, survives withdrawals
}

export interface DepositParams {
  amount: string;
  vaultAddress: string;
}

export interface WithdrawParams {
  amount: string;
  vaultAddress: string;
}

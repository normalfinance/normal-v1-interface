// Savings types for DeFindex integration

export interface VaultInfo {
  address: string;
  name: string;
  symbol?: string;
  totalDeposits: string; // from totalManagedFunds
  apy: number;
  asset: string; // USDC
  fees?: { vaultFee: number; defindexFee: number };
}

export interface SavingsPosition {
  shares: string; // dfTokens
  currentValue: string; // underlying asset value
  earnings: string; // derived: currentValue - totalDeposited
}

export interface DepositParams {
  amount: string;
  vaultAddress: string;
}

export interface WithdrawParams {
  amount: string;
  vaultAddress: string;
}

// Savings types for DeFindex integration

export interface VaultInfo {
  address: string;
  name: string;
  totalDeposits: string;
  apy: number;
  asset: string; // USDC
  sharePrice: string;
}

export interface SavingsPosition {
  deposited: string;
  shares: string;
  currentValue: string;
  earnings: string;
}

export interface DepositParams {
  amount: string;
  vaultAddress: string;
}

export interface WithdrawParams {
  amount: string;
  vaultAddress: string;
}

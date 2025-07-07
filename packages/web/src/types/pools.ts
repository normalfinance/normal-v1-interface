export type TxType = 'Buy' | 'Sell' | 'Deposit' | 'Withdraw';

export interface PoolTxRow {
  timestamp: number;
  type: TxType;
  usdValue: number;
  usdcValue: number;
  ethValue: number;
  wallet: string;
}

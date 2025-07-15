export type TxType = 'Buy' | 'Sell' | 'Deposit' | 'Withdraw';

export interface PoolTxRow {
  timestamp: number;
  type: TxType;
  baseValue: number;
  quoteValue: number;
  wallet: string;
  txHash: string;
}

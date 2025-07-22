export type TxType = 'Buy' | 'Sell' | 'Deposit' | 'Withdraw';

export interface PoolTxRow {
  type: TxType;
  // usdValue: number; // coming soon
  tokenAAmount: number;
  tokenBAmount: number;
  user: string;
  timestamp: string;
  txHash: string;
}

export type TxType = 'Buy' | 'Sell' | 'Deposit' | 'Withdraw';

export interface PoolTxRow {
  type: TxType;
  // usdValue: number; // coming soon
  tokenAAmount: BigNumber;
  tokenBAmount: BigNumber;
  user: string;
  timestamp: number;
  txHash: string;
}

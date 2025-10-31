export type TxType = 'Buy' | 'Sell' | 'Deposit' | 'Withdraw';

export interface PoolTxRow {
  type: TxType;
  tokenAAmount: BigNumber;
  tokenBAmount: BigNumber;
  user: string;
  timestamp: number;
  txHash: string;
}

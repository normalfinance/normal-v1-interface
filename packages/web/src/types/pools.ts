export type TxType = 'Mint' | 'Redeem' | 'Buy' | 'Sell' | 'Deposit' | 'Withdraw';

export interface PairTxRow {
  type: TxType;
  side?: 'Long' | 'Short';
  usdcAmount: BigNumber;
  assetAmount: BigNumber;
  user: string;
  timestamp: number;
  txHash: string;
}

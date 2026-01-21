export type TxType = 'Mint' | 'Redeem' | 'Buy' | 'Sell' | 'Deposit' | 'Withdraw';

export interface PairTxRow {
  type: TxType;
  usdcAmount: BigNumber;
  assetAmount: BigNumber;
  user: string;
  timestamp: number;
  txHash: string;
}

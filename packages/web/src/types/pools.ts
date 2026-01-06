export type TxType = 'Mint' | 'Redeem' | 'Trade' | 'Deposit' | 'Withdraw';

export interface PairTxRow {
  type: TxType;
  amount: BigNumber;
  user: string;
  timestamp: number;
  txHash: string;
}

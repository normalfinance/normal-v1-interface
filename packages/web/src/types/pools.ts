export type TxType = 'Buy' | 'Sell' | 'Mint' | 'Redeem';

export interface PoolTxRow {
  timestamp: number;
  type: TxType;
  usdValue: number;
  usdcValue: number;
  ethValue: number;
  wallet: string;
}

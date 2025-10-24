export * as events from './events';
export * from './soroban';

export type TokenInfo = {
  address: string;
  amount: number;
  symbol: string;
  oraclePrice: bigint;
};
export type PoolInfo = {
  address: string;
  token_a: TokenInfo;
  token_b: TokenInfo;
  token_share: TokenInfo;
  total_shares: number;
  fee_fraction: number;
};

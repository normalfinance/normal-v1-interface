export * as events from './events';
export * from './soroban';

export type TokenInfo = {
  address: string;
  amount: number;
  symbol: string;
};
export type PoolReserves = {
  tokenA: number;
  tokenB: number;
};
export type PoolInfo = {
  address: string;
  index: Buffer;
  tokenA: string;
  tokenB: string;
  reserves: PoolReserves;
  prices: PoolReserves;
  tokenShare: TokenInfo;
  totalShares: number;
  feeFraction: number;
};

import { TokenInfo } from '.';
import { PoolContract, PoolElasticContract } from '@normalfinance/contracts';

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
  version: string;
  client: PoolContract.Client | PoolElasticContract.Client;
};

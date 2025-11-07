import { PoolContract, PoolElasticContract } from '@normalfinance/contracts';

export type Address = string;

export type Pool = {
  index: Buffer;
  version: string;
  fee: number; // 10, 30, or 100
  addresses: {
    pool: Address;
    tokenA: Address;
    tokenB: Address;
    tokenShare: Address;
  };
  reserves: {
    tokenA: string;
    tokenB: string;
  };
  prices: {
    tokenA: string;
    tokenB: string;
  };
  shares: {
    address: Address;
    total: string;
    symbol: string;
  };
  client: PoolContract.Client | PoolElasticContract.Client;
};

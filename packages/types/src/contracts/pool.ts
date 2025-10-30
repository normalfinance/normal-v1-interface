import { PoolContract, PoolElasticContract } from '@normalfinance/contracts';
import BigNumber from 'bignumber.js';

export type PoolTokenValues = {
  tokenA: BigNumber;
  tokenB: BigNumber;
};

export type Pool = {
  address: string;
  index: Buffer;
  tokenA: string;
  tokenB: string;
  reserves: PoolTokenValues; // balances
  prices: PoolTokenValues;
  tokenShare: {
    address: string;
    amount: BigNumber;
    symbol: string;
  };
  totalShares: BigNumber;
  feeFraction: BigNumber;
  version: string;
  client: PoolContract.Client | PoolElasticContract.Client;
};

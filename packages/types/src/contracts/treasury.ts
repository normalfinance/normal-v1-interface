import { TreasuryContract } from '@normalfinance/contracts';
import { Address } from './pair';

export type Treasury = {
  version: string;
  fee: number; // 10, 30, or 100
  addresses: Address;
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
  client: TreasuryContract.Client;
};

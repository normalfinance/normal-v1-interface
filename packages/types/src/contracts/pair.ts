import { LongShortPairContract } from '@normalfinance/contracts';

export type Address = string;

export type Pair = {
  version: string;
  addresses: {
    pair: Address;
    tokenLong: Address;
    tokenShort: Address;
  };
  collateral: {
    perPair: string;
    percentLong: string;
    amount: string;
  };
  client: LongShortPairContract.Client;
};

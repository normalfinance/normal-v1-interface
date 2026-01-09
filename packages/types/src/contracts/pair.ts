import { LongShortPairContract } from '@normalfinance/contracts';

export type Address = string;

export type Pair = {
  pairAddress: string;
  asset: string;
  status: LongShortPairContract.PairStatus;
  tokens: {
    long: Address;
    short: Address;
  };
  collateral: {
    collateralToken: string;
    collateralPerPair: string;
    collateralPercentLong: string;
    totalCollateral: string;
  };
  scaledPrice: string;
  priceBounds: {
    lower: string;
    upper: string;
  };
  client: LongShortPairContract.Client;
};

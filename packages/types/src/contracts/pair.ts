import { LongShortPairContract } from '@normalfinance/contracts';

export type Address = string;

export type Pair = {
  pairAddress: string;
  asset: string;
  status: LongShortPairContract.PairStatus;
  tokens: LongShortPairContract.PairTokens;
  collateral: {
    collateralPerPair: string;
    collateralPercentLong: string;
    totalCollateral: string;
  };
  scaledPrice: string;
  priceBounds: LongShortPairContract.PairPriceBounds;
  client: LongShortPairContract.Client;
};

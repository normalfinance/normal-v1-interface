import type { Token } from '@normalfinance/types';
import { BigNumber } from 'bignumber.js';

export const convertFiatToCoin = (fiatAmount: number, tokenPrice: BigNumber): BigNumber =>
  BigNumber(fiatAmount).dividedBy(tokenPrice);

export const convertCoinToFiat = (coinAmount: BigNumber, tokenPrice: BigNumber): string =>
  coinAmount.multipliedBy(tokenPrice).toFixed(2);

// In send-card it gets max amount of token in coutn or $ based on the input mode
export const getMaxAmount = (token: Token, isFiatMode: boolean): string => {
  if (isFiatMode) {
    const fiatVal = BigNumber(token.balance).multipliedBy(token.price);
    return fiatVal.toFixed(token.decimals); // Adjust precision as needed
  } else {
    return BigNumber(token.balance).toFixed(token.decimals);
  }
};

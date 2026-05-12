import type { Token } from '@normalfinance/types';
import { BigNumber } from 'bignumber.js';

export const convertFiatToCoin = (fiatAmount: number, tokenPrice: BigNumber): BigNumber =>
  BigNumber(fiatAmount).dividedBy(tokenPrice);

export const convertCoinToFiat = (coinAmount: BigNumber, tokenPrice: BigNumber): string =>
  coinAmount.multipliedBy(tokenPrice).toFixed(2);

// In send-card it gets max amount of token in count or $ based on the input mode.
// xlmReserve: pass the minimum XLM reserve (e.g. (2 + subentry_count) * 0.5) for native XLM tokens.
export const getMaxAmount = (token: Token, isFiatMode: boolean, xlmReserve?: number): string => {
  const FEE_XLM = 0.0002;
  const spendable =
    token.symbol === 'XLM' && xlmReserve !== undefined
      ? BigNumber(token.balance).minus(xlmReserve).minus(FEE_XLM)
      : BigNumber(token.balance);
  const clamped = BigNumber.max(spendable, 0);

  if (isFiatMode) {
    return clamped.multipliedBy(token.price).toFixed(token.decimals);
  }
  return clamped.toFixed(token.decimals);
};

import type { Token } from '@normalfinance/types';

import { BigNumber } from 'bignumber.js';

import { fCurrencyTwoDecimals } from './format-number';

// 1 USDC = 0.000355263 ETH ($1.00) - We are swaping ETH to USDC
export const getConversionText = (sellToken: Token, buyToken: Token): string => {
  const conversion = BigNumber(buyToken.price).dividedBy(sellToken.price);
  return `1 ${buyToken.symbol} = ${conversion.toFixed(sellToken.decimals)} ${sellToken.symbol} (${fCurrencyTwoDecimals(
    buyToken.price
  )})`;
};

export const getConversionTextScaled = (
  sellToken: Token,
  buyToken: Token,
  pair: { scaledPrice: string }
): string =>
  `1 ${buyToken.symbol} = ${fCurrencyTwoDecimals(pair.scaledPrice)}`;

// 1 ETH = $2,814.81 USDC ($2,814.81) - We are swaping ETH to USDC
export const getSwapConversionText = (sellToken: Token, buyToken: Token): string => {
  const conversion = BigNumber(sellToken.price).dividedBy(buyToken.price);
  return `1 ${sellToken.symbol} = ${conversion.toFixed(buyToken.decimals)} ${buyToken.symbol} (${fCurrencyTwoDecimals(conversion.multipliedBy(buyToken.price))})`;
};

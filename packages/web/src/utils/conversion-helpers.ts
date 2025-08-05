import type { StateToken as Token } from '@normalfinance/types';

import { fCurrencyTwoDecimals } from './format-number';

//1 USDC = 0.000355263 ETH ($1.00) - We are swaping ETH to USDC
export const getConversionText = (sellToken: Token, buyToken: Token): string => {
  const conversion = buyToken.usdValue / sellToken.usdValue;
  return `1 ${buyToken.symbol} = ${conversion.toFixed(9)} ${sellToken.symbol} (${fCurrencyTwoDecimals(
    buyToken.usdValue
  )})`;
};

// 1 ETH = $2,814.81 USDC ($2,814.81) - We are swaping ETH to USDC
export const getSwapConversionText = (sellToken: Token, buyToken: Token): string => {
  const conversion = sellToken.usdValue / buyToken.usdValue;
  return `1 ${sellToken.symbol} = ${fCurrencyTwoDecimals(conversion)} ${buyToken.symbol} (${fCurrencyTwoDecimals(conversion)})`;
};

export const convertFiatToCoin = (fiatAmount: number, tokenPrice: number): number =>
  fiatAmount / tokenPrice;

export const convertCoinToFiat = (coinAmount: number, tokenPrice: number): number =>
  coinAmount * tokenPrice;

// In send-card it gets max amount of token in coutn or $ based on the input mode
export const getMaxAmount = (
  tokenBalance: number,
  tokenPrice: number,
  isFiatMode: boolean
): string => {
  if (isFiatMode) {
    const fiatVal = tokenBalance * tokenPrice;
    return fiatVal.toFixed(6); // Adjust precision as needed
  } else {
    return tokenBalance.toFixed(6);
  }
};

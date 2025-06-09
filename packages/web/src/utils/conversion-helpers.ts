import { fCurrencyTwoDecimals } from './format-number';
import { Token } from '@/types/token';

//1 USDC = 0.000355263 ETH ($1.00) - We are swaping ETH to USDC
export const getConversionText = (sellToken: Token, buyToken: Token): string => {
  const conversion = buyToken.pricestatus / sellToken.pricestatus;
  return `1 ${buyToken.shortname} = ${conversion.toFixed(9)} ${sellToken.shortname} (${fCurrencyTwoDecimals(
    buyToken.pricestatus
  )})`;
};

// 1 ETH = $2,814.81 USDC ($2,814.81) - We are swaping ETH to USDC
export const getSwapConversionText = (sellToken: Token, buyToken: Token): string => {
  const conversion = sellToken.pricestatus / buyToken.pricestatus;
  return `1 ${sellToken.shortname} = ${fCurrencyTwoDecimals(conversion)} ${buyToken.shortname} (${fCurrencyTwoDecimals(conversion)})`;
};

export const convertFiatToCoin = (fiatAmount: number, tokenPrice: number): number => {
  return fiatAmount / tokenPrice;
};

export const convertCoinToFiat = (coinAmount: number, tokenPrice: number): number => {
  return coinAmount * tokenPrice;
};

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

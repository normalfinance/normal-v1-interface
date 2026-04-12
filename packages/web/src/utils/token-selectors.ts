import type { Token } from '@normalfinance/types';

import { constants } from '@normalfinance/utils';

export function getTokenBalance(token?: Token): string {
  return token?.balance || '0';
}

export function getXlmToken(tokens: Token[]): Token | undefined {
  return tokens.find((token) => token.symbol === 'XLM');
}

function getTokenByContract(tokens: Token[], contract?: string): Token | undefined {
  if (!contract) {
    return undefined;
  }

  return tokens.find((token) => token.contract === contract);
}

export function getSwapUsdcToken(tokens: Token[]): Token | undefined {
  return getTokenByContract(tokens, constants.StellarConfig.USDC_ADDRESS);
}

export function getSavingsDepositToken(tokens: Token[]): Token | undefined {
  return getTokenByContract(
    tokens,
    constants.StellarConfig.BLEND_USDC_ADDRESS ?? constants.StellarConfig.USDC_ADDRESS
  );
}

export function getSavingsDepositTokenLabel(): string {
  return constants.StellarConfig.BLEND_USDC_ADDRESS ? 'Blend USDC' : 'USDC';
}

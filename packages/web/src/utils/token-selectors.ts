import type { Token, NetworkConfig } from '@normalfinance/types';

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

export function getSwapUsdcToken(
  tokens: Token[],
  config: NetworkConfig = constants.StellarConfig
): Token | undefined {
  return getTokenByContract(tokens, config.USDC_ADDRESS);
}

export function getSavingsDepositToken(
  tokens: Token[],
  config: NetworkConfig = constants.StellarConfig
): Token | undefined {
  return getTokenByContract(tokens, config.BLEND_USDC_ADDRESS || config.USDC_ADDRESS);
}

export function getSavingsDepositTokenLabel(
  config: NetworkConfig = constants.StellarConfig
): string {
  return config.BLEND_USDC_ADDRESS ? 'Blend USDC' : 'USDC';
}

export function getSavingsUsdcIssuer(
  config: NetworkConfig = constants.StellarConfig
): string | undefined {
  return config.BLEND_USDC_ISSUER || config.USDC_ISSUER || undefined;
}

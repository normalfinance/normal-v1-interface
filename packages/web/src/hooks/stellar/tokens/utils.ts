import type { Token, TokenMapType } from '@normalfinance/types';

export const tokensToMap = (tokens: Token[]) => {
  if (!tokens) return {};

  return tokens.reduce((map: TokenMapType, token) => {
    map[token.contract] = token;
    return map;
  }, {});
};

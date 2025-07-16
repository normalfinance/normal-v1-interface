import type { StateToken, TokenMapType } from '@normalfinance/types';

export const tokensToMap = (tokens: StateToken[]) => {
  if (!tokens) return {};

  return tokens.reduce((map: TokenMapType, token) => {
    map[token.id] = token;
    return map;
  }, {});
};

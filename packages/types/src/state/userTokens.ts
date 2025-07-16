import { StateToken, TokenMapType } from './wallet';

export interface UserAddedTokens {
  allUserAddedTokens: any[];
  tokens: StateToken[];
  tokensAsMap: TokenMapType;
}

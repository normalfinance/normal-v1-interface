import { StateToken, TokenMapType } from './wallet';

export interface UserAddedTokensState {
  allUserAddedTokens: any[];
  tokens: StateToken[];
  tokensAsMap: TokenMapType;
}
export interface UserAddedTokensActions {
  userAddedTokensState: UserAddedTokensState;
}

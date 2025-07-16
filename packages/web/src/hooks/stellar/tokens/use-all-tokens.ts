import { usePersistStore } from '@normalfinance/state';

import { useApiTokens } from './use-api-tokens';

//Returns tokens from the API and user added
export const useAllTokens = () => {
  const store = usePersistStore();

  const { tokensAsMap: apiTokensAsMap, tokens: apiTokens, isLoading } = useApiTokens();
  // const { tokensAsMap: userAddedTokensAsMap, tokens: userTokens } = useUserAddedTokens();

  return {
    tokensAsMap: { ...apiTokensAsMap },
    tokens: [...apiTokens],
    isLoading,
  };
};

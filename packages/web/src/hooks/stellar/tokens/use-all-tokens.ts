import { useApiTokens } from './use-api-tokens';

//Returns tokens from the API and user added
export const useAllTokens = () => {
  const { tokensAsMap: apiTokensAsMap, tokens: apiTokens, isLoading } = useApiTokens();
  // TODO: add featured tokens

  return {
    tokensAsMap: { ...apiTokensAsMap },
    tokens: [...apiTokens],
    isLoading,
  };
};

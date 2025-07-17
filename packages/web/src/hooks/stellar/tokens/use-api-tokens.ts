import type { StateToken, TokenMapType } from '@normalfinance/types';

import { useState, useEffect } from 'react';
import useSWRImmutable from 'swr/immutable';

import { tokensToMap } from './utils';
import { fetchApiTokens } from './use-featured-tokens';

//Returns tokens from the API
export const useApiTokens = () => {
  const { data, mutate, isLoading, error } = useSWRImmutable(['tokens'], () => fetchApiTokens());

  const [tokens, setTokens] = useState<StateToken[]>([]);
  const [tokensAsMap, setTokensAsMap] = useState<TokenMapType>({});

  useEffect(() => {
    if (data && data.length > 0) {
      setTokens(data.assets);
    }

    const mappedTokens = tokensToMap(tokens);
    setTokensAsMap(mappedTokens);
  }, [data, tokens]);

  return { tokens, mutate, isLoading, isError: error, data, tokensAsMap };
};

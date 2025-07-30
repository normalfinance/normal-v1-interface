import type { TokenMapType, StateToken as Token } from '@normalfinance/types';

import axios from 'axios';
import { useState, useEffect } from 'react';
import useSWRImmutable from 'swr/immutable';

import { tokensToMap } from './utils';

export const useFeaturedTokens = () => {
  const { data, mutate, isLoading, error } = useSWRImmutable(['featured_tokens'], () =>
    fetchFeaturedTokens()
  );

  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokensAsMap, setTokensAsMap] = useState<TokenMapType>({});

  useEffect(() => {
    if (data && data.length > 0) {
      setTokens(tokens);

      const mappedTokens = tokensToMap(tokens);
      setTokensAsMap(mappedTokens);
    }
  }, [data, tokens]);
  return { tokens, mutate, isLoading, isError: error, data, tokensAsMap };
};

export const fetchFeaturedTokens = async () => {
  const { data } = await axios.get(
    'https://raw.githubusercontent.com/normalfinance/token-list/main/tokenListFeatured.json'
  );

  return data;
};

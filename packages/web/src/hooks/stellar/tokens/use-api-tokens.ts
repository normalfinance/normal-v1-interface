import type { ApiToken } from '@normalfinance/types';

import axios from 'axios';
import { useState, useEffect } from 'react';
import useSWRImmutable from 'swr/immutable';
import { constants } from '@normalfinance/utils';

//Returns tokens from the API
export const useApiTokens = () => {
  const { data, mutate, isLoading, error } = useSWRImmutable(['api_tokens'], () =>
    fetchApiTokens()
  );

  const [tokens, setTokens] = useState<ApiToken[]>([]);
  // const [tokensAsMap, setTokensAsMap] = useState<TokenMapType>({});

  useEffect(() => {
    if (data) {
      setTokens(data.assets);
    }

    // const mappedTokens = tokensToMap(tokens);
    // setTokensAsMap(mappedTokens);
  }, [data, tokens]);

  return { tokens, mutate, isLoading, isError: error, data };
};

export const fetchApiTokens = async () => {
  let url = 'https://raw.githubusercontent.com/normalfinance/token-list/main/tokenList.json';

  if (constants.StellarConfig.RPC_URL.includes('testnet')) {
    url = 'https://raw.githubusercontent.com/normalfinance/token-list/main/tokenListTestnet.json';
  }

  const { data } = await axios.get(url);

  return data;
};

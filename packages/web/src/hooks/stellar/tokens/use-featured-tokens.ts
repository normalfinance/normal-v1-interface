import axios from 'axios';
import { useState, useEffect } from 'react';
import useSWRImmutable from 'swr/immutable';

export const useFeaturedTokens = () => {
  const { data, mutate, isLoading, error } = useSWRImmutable(['featured_tokens'], () =>
    fetchFeaturedTokens()
  );

  const [tokens, setTokens] = useState<string[]>([]);

  useEffect(() => {
    if (data && data.length > 0) {
      setTokens(tokens);
    }
  }, [data, tokens]);
  return { tokens, mutate, isLoading, isError: error, data };
};

export const fetchFeaturedTokens = async () => {
  const { data } = await axios.get(
    'https://raw.githubusercontent.com/normalfinance/token-list/main/tokenList.json'
  );

  return data;
};

export const fetchApiTokens = async () => {
  const { data } = await axios.get(
    'https://raw.githubusercontent.com/normalfinance/token-list/main/tokenList.json'
  );

  return data;
};

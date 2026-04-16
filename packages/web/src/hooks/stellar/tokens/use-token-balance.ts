import useSWRImmutable from 'swr/immutable';
import { usePersistStore } from '@normalfinance/state';
import { getTokenBalance } from '@normalfinance/utils';
import type { NetworkConfig } from '@normalfinance/types';

import { useStellarConfig } from '@/hooks';

interface FetchTokenBalanceProps {
  tokenAddress: string;
  address: string;
  config: NetworkConfig;
}

const fetchTokenBalance = async ({ tokenAddress, address, config }: FetchTokenBalanceProps) => {
  const balance = await getTokenBalance(tokenAddress, address, config);

  if (balance === null) {
    throw new Error('Failed to fetch balance');
  }

  return { data: balance, validAccount: true };
};

export const useTokenBalance = (tokenAddress: string | null) => {
  const config = useStellarConfig();
  const store = usePersistStore();
  const address = store.wallet.address;

  const canFetch = !!(address && tokenAddress);

  const { data, isLoading, mutate, error } = useSWRImmutable(
    canFetch ? ['token-balance', tokenAddress, address, config.RPC_URL] : null,
    ([, tokenAddr, addr]) => fetchTokenBalance({ tokenAddress: tokenAddr, address: addr, config })
  );

  return {
    data: canFetch ? data : null,
    isLoading: canFetch ? isLoading : false,
    mutate,
    isError: canFetch ? error : null,
  };
};

import useSWRImmutable from 'swr/immutable';
import { getTokenBalance } from '@/lib/token';
import { usePersistStore } from '@normalfinance/state';

interface FetchTokenBalanceProps {
  tokenAddress: string;
  address: string;
}

const fetchTokenBalance = async ({ tokenAddress, address }: FetchTokenBalanceProps) => {
  const balance = await getTokenBalance(tokenAddress, address);

  if (balance === null) {
    throw new Error('Failed to fetch balance');
  }

  return { data: balance, validAccount: true };
};

const useTokenBalance = (tokenAddress: string | null) => {
  const store = usePersistStore();
  const address = store.wallet.address;

  const canFetch = !!(address && tokenAddress);

  const { data, isLoading, mutate, error } = useSWRImmutable(
    canFetch ? ['token-balance', tokenAddress, address] : null,
    ([, tokenAddr, addr]) => fetchTokenBalance({ tokenAddress: tokenAddr, address: addr })
  );

  return {
    data: canFetch ? data : null,
    isLoading: canFetch ? isLoading : false,
    mutate,
    isError: canFetch ? error : null,
  };
};

export default useTokenBalance;

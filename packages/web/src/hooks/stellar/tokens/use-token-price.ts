import useSWRImmutable from 'swr/immutable';
import { getOraclePrice } from '@/lib/oracle';
import { usePersistStore } from '@normalfinance/state';

interface FetchTokenBalanceProps {
  oracleAddress: string;
  tokenAddress: string;
}

const fetchOraclePrice = async ({ oracleAddress, tokenAddress }: FetchTokenBalanceProps) => {
  const { price, timestamp } = await getOraclePrice(oracleAddress, tokenAddress);

  if (price === null) {
    throw new Error('Failed to fetch price');
  }

  return { data: price, validAccount: true };
};

export const useTokenPrice = (tokenAddress: string | null) => {
  const store = usePersistStore();
  const address = store.wallet.address;

  const canFetch = !!(address && tokenAddress);

  const { data, isLoading, mutate, error } = useSWRImmutable(
    canFetch ? ['token-price', tokenAddress, address] : null,
    ([, tokenAddr, addr]) => fetchOraclePrice({ oracleAddress: '', tokenAddress: tokenAddr })
  );

  return {
    data: canFetch ? data : null,
    isLoading: canFetch ? isLoading : false,
    mutate,
    isError: canFetch ? error : null,
  };
};

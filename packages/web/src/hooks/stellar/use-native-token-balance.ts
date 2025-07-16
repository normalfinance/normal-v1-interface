import useSWRImmutable from 'swr/immutable';
import { getTokenBalance } from '@/lib/token';
import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';

interface FetchBalanceProps {
  address: string;
}

const fetchBalance = async ({ address }: FetchBalanceProps) => {
  const balance = await getTokenBalance(constants.XLM_ADDRESS, address);

  if (balance === null) {
    throw new Error('Failed to fetch balance');
  }

  return { data: balance, validAccount: true };
};

const useNativeTokenBalance = () => {
  const store = usePersistStore();

  if (store.wallet.address == undefined) throw new Error('Missing address');

  const address = store.wallet.address;

  const { data, isLoading, mutate, error } = useSWRImmutable(
    ['native-balance', store.wallet.address],
    ([key]) => fetchBalance({ address }) // TODO: add address after key
  );

  return {
    data,
    isLoading,
    mutate,
    isError: error,
  };
};

export default useNativeTokenBalance;

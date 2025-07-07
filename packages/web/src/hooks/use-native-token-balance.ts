import useSWRImmutable from 'swr/immutable';
import { constants } from '@normalfinance/utils';

import { tokenBalance } from './useBalances';

interface FetchBalanceProps {
  sorobanContext: SorobanContextType;
  address?: string;
}

const fetchBalance = async ({ address }: FetchBalanceProps) => {
  if (!address) throw new Error('Missing sorobanContext or address');

  const networkNativeToken = constants.xlmTokenList.find(
    (nativeToken) => nativeToken.network === constants.NETWORK_PASSPHRASE
  );

  if (!networkNativeToken) throw new Error(`Native token not found for network ${currentNetwork}`);

  try {
    // Horizon.ServerApi.
    await sorobanContext.sorobanServer?.getAccount(address);
  } catch (error) {
    return { data: 0, validAccount: false };
  }

  const balance = await tokenBalance(networkNativeToken.assets[0].contract, address);

  if (balance === null) {
    throw new Error('Failed to fetch balance');
  }

  return { data: balance, validAccount: true };
};

const useNativeTokenBalance = () => {
  const { address } = sorobanContext;

  const { data, isLoading, mutate, error } = useSWRImmutable(
    ['native-balance', address],
    ([key, address]) => fetchBalance({ address })
  );

  return {
    data,
    isLoading,
    mutate,
    isError: error,
  };
};

export default useNativeTokenBalance;

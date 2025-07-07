import type { StellarTokenType } from '@normalfinance/types';
import type { AccountResponse } from '@stellar/stellar-sdk/lib/horizon';

import { useCallback } from 'react';
import BigNumber from 'bignumber.js';
import useSWRImmutable from 'swr/immutable';
import { BASE_FEE } from '@stellar/stellar-sdk';
import { usePersistStore } from '@normalfinance/state';

import { tokenBalances } from './useBalances';
import { useAllTokens } from './tokens/useAllTokens';
import useGetSubentryCount from './useGetSubentryCount';
import useHorizonLoadAccount from './useHorizonLoadAccount';

interface FetchBalancesProps {
  address?: string;
  tokens: StellarTokenType[];
  account: AccountResponse | undefined;
}

const fetchBalances = async ({ address, tokens, account }: FetchBalancesProps) => {
  if (!address || !tokens || !account) return null;

  const response = await tokenBalances(address, tokens, account, true);

  return response;
};

function calculateAvailableBalance(
  balance?: string | number | BigNumber | null,
  networkFees?: string | number | BigNumber | null,
  subentryCount?: number
): BigNumber {
  if (!balance) return BigNumber(0);
  const baseBalance = new BigNumber(balance).shiftedBy(-7);
  const adjustment = new BigNumber(networkFees ?? Number(BigNumber(BASE_FEE).shiftedBy(-7)))
    .plus(1)
    .plus(new BigNumber(subentryCount ?? 0).multipliedBy(0.5));
  return BigNumber.max(new BigNumber(0), baseBalance.minus(adjustment)).decimalPlaces(7);
}

// ----------------------------------------------------------------------

interface ReturnType {
  tokens: StellarTokenType[];
  tokenBalancesResponse: any;
  availableNativeBalance: any;
  loading: boolean;
  error: boolean;
  refetch: any;
}

// ----------------------------------------------------------------------

export function useUserBalances(): ReturnType {
  const persist = usePersistStore();

  const address = persist.wallet.address;
  const { tokens, isLoading: isLoadingTokens } = useAllTokens();
  const { subentryCount, nativeBalance, isLoading: isSubentryLoading } = useGetSubentryCount();

  const { account, mutate: refetchAccount } = useHorizonLoadAccount();

  const {
    data,
    isLoading,
    mutate: refetchBalances,
    error,
  } = useSWRImmutable(
    address && account && tokens.length > 0
      ? ['balance', address, tokens, account, tokens.length]
      : null,
    ([key, address, tokens, sorobanContext, account]) => fetchBalances({ address, tokens, account })
  );

  const availableNativeBalance = useCallback(
    (networkFees?: string | number | BigNumber | null) =>
      calculateAvailableBalance(nativeBalance, networkFees, subentryCount),
    [nativeBalance, subentryCount]
  );

  const refresh = async () => {
    await refetchAccount();
    await refetchBalances();
  };

  return {
    tokens,
    tokenBalancesResponse: data,
    availableNativeBalance,
    error,
    loading: isLoading || isLoadingTokens || isSubentryLoading,
    refetch: refresh,
  };
}

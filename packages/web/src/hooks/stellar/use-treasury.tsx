'use client';

import { BigNumber } from 'bignumber.js';
import { useState, useCallback } from 'react';
import { format, constants } from '@normalfinance/utils';
import { TreasuryContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

export type TreasuryBalances = {
  long: BigNumber;
  short: BigNumber;
  usdc: BigNumber;
};

interface ReturnType {
  error: any | null;
  loading: boolean;
  fetchBalances: (pairAddress: string) => Promise<TreasuryBalances | undefined>;
}

// ----------------------------------------------------------------------

export function useTreasury(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch info from Treasury
  const TreasuryClient = new TreasuryContract.Client({
    contractId: constants.StellarConfig.TREASURY_ADDRESS,
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    rpcUrl: constants.StellarConfig.RPC_URL,
  });

  const fetchBalances = useCallback(async (pairAddress: string) => {
    try {
      setError(null);
      setLoading(true);

      const balancesResponse = await TreasuryClient.get_balances({
        pair: pairAddress,
      });

      if (balancesResponse && balancesResponse.result) {
        const balances = balancesResponse.result as TreasuryContract.PairAmountsWithUSDC;

        const treasuryBalances: TreasuryBalances = {
          long: BigNumber(format.fTokenAmount(balances.long, 7)),
          short: BigNumber(format.fTokenAmount(balances.short, 7)),
          usdc: BigNumber(format.fTokenAmount(balances.usdc, 7)),
        };

        return treasuryBalances;
      }
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
    return undefined;
  }, []);

  return {
    error,
    loading,
    fetchBalances,
  };
}

'use client';

import { BigNumber } from 'bignumber.js';
import { useState, useEffect, useCallback } from 'react';
import { format, constants } from '@normalfinance/utils';
import { TreasuryContract } from '@normalfinance/contracts';

import type { TreasuryBalances } from './use-treasury';

// ----------------------------------------------------------------------
interface ReturnType {
  error: any | null;
  loading: boolean;
  balances: TreasuryBalances | undefined;
}

// ----------------------------------------------------------------------

export function useTreasuryBalances(pairAddress: string): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [treasuryBalances, setTreasuryBalances] = useState<TreasuryBalances | undefined>(undefined);

  // Fetch info from Treasury
  const TreasuryClient = new TreasuryContract.Client({
    contractId: constants.StellarConfig.TREASURY_ADDRESS,
    networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
    rpcUrl: constants.StellarConfig.RPC_URL,
  });

  const fetchBalances = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const balancesResponse = await TreasuryClient.get_balances({
        pair: pairAddress,
      });

      if (balancesResponse && balancesResponse.result) {
        const balances = balancesResponse.result as TreasuryContract.PairAmountsWithUSDC;

        const newTreasuryBalances: TreasuryBalances = {
          long: BigNumber(format.fTokenAmount(balances.long, 7)),
          short: BigNumber(format.fTokenAmount(balances.short, 7)),
          usdc: BigNumber(format.fTokenAmount(balances.usdc, 7)),
        };

        setTreasuryBalances(newTreasuryBalances);
      }
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
    return;
  }, []);

  // On component mount, fetch balances
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances, pairAddress]);

  return {
    error,
    loading,
    balances: treasuryBalances,
  };
}

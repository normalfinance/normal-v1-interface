'use client';

import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  totalTVL: number | undefined;
  fetchTVL: () => void;
}

// ----------------------------------------------------------------------

export function useTotalTVL(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalTVL, setTotalTVl] = useState<number | undefined>(undefined);
  const storePersist = usePersistStore();

  const fetchTVL = useCallback(async (poolAddresses?: string[]) => {
    try {
      await rateLimitCheck();

      if (!poolAddresses) {
        const PoolRouter = new PoolRouterContract.Client({
          contractId: constants.POOL_ROUTER_ADDRESS,
          networkPassphrase: constants.NETWORK_PASSPHRASE,
          rpcUrl: constants.RPC_URL,
        });
      }

      // const LiquidityCalculator = new Liquidit.Client({
      //   contractId: constants.POOL_ROUTER_ADDRESS,
      //   networkPassphrase: constants.NETWORK_PASSPHRASE,
      //   rpcUrl: constants.RPC_URL,
      // });

      // const tvl = await LiquidityCalculator.get_total_tvl({ pool_addresses: poolAddresses });

      // if (tvl.result) {
      //   setTotalTVl(tvl.result);
      // }
      setTotalTVl(0);
    } catch (e: any) {
      console.log(e);
      setError(e);
    }
    return;
  }, []);

  // On component mount, fetch pool
  useEffect(() => {
    fetchTVL();
  }, [fetchTVL]);

  return {
    error,
    loading,
    totalTVL,
    fetchTVL,
  };
}

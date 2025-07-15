'use client';

import { constants } from '@normalfinance/utils';
import { useState, useEffect, useCallback } from 'react';
import { PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  tvl: number | undefined;
  refresh: () => void;
}

// ----------------------------------------------------------------------

export function usePoolTVL(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalTVL, setTotalTVl] = useState<number | undefined>(undefined);

  const fetchTVL = useCallback(async (asset: string) => {
    try {
      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const tvl = await PoolRouter.get_total_liquidity({ asset });

      if (tvl.result) {
        setTotalTVl(tvl.result);
      }
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

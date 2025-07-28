'use client';

import { useState, useCallback } from 'react';
import { constants } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import { PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  tvl: number | undefined;
  refresh: (asset: string) => void;
}

// ----------------------------------------------------------------------

export function usePoolTVL(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalTVL, setTotalTVl] = useState<number | undefined>(undefined);
  const storePersist = usePersistStore();

  const fetchTVL = useCallback(async (asset: string) => {
    try {
      await rateLimitCheck();

      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
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

  return {
    error,
    loading,
    tvl: totalTVL,
    refresh: fetchTVL,
  };
}

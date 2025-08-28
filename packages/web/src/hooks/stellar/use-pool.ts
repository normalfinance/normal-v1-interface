'use client';

import { captureException } from '@sentry/nextjs';
import { format, constants } from '@normalfinance/utils';
import { useState, useEffect, useCallback } from 'react';
import { PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  pool: PoolRouterContract.PoolInfo | undefined;
  fetchPool: () => void;
}

// ----------------------------------------------------------------------

export function usePool(asset: string): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pool, setPool] = useState<PoolRouterContract.PoolInfo | undefined>(undefined);

  const fetchPool = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const poolInfo = await PoolRouter.query_pool_details({
        asset: format.formatNormalToken(asset, 'without-n'),
      });

      if (poolInfo.result) {
        const data = poolInfo.result as PoolRouterContract.PoolInfo;
        setPool(data);
      }
    } catch (e: any) {
      captureException(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // On component mount, fetch pool
  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  return {
    error,
    loading,
    pool,
    fetchPool,
  };
}

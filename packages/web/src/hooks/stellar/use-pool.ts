'use client';

import type { PoolRouterContract } from '@normalfinance/contracts';

import { constants } from '@normalfinance/utils';
import { captureException } from '@sentry/nextjs';
import { PoolContract } from '@normalfinance/contracts';
import { useState, useEffect, useCallback } from 'react';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  pool: PoolRouterContract.PoolInfo | undefined;
  // tvl: BigNumber | undefined;
  fetchPool: () => void;
}

// ----------------------------------------------------------------------

export function usePool(poolAddress: string): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pool, setPool] = useState<PoolRouterContract.PoolInfo | undefined>(undefined);
  // const [tvl, setTvl] = useState<BigNumber | undefined>(undefined);

  const fetchPool = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const Pool = new PoolContract.Client({
        contractId: poolAddress,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const poolInfo = await Pool.get_info();

      if (poolInfo.result) {
        const data = poolInfo.result as PoolRouterContract.PoolInfo;
        setPool(data);

        // const PoolRouter = new PoolRouterContract.Client({
        //   contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        //   networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        //   rpcUrl: constants.StellarConfig.RPC_URL,
        // });

        // const liquidityInfo = await PoolRouter.get_liquidity({
        //   asset: data.pool_response.pool.base_asset,
        // });
        
        // if (liquidityInfo.result) {
        //   setTvl(BigNumber(liquidityInfo.result));
        // }
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
    // tvl,
    fetchPool,
  };
}

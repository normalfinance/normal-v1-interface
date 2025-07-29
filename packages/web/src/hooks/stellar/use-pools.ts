'use client';

import { constants } from '@normalfinance/utils';
import { captureException } from '@sentry/nextjs';
import { useState, useEffect, useCallback } from 'react';
import { PoolRouterContract } from '@normalfinance/contracts';
import { useAppStore, usePersistStore } from '@normalfinance/state';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  pools: PoolRouterContract.PoolInfo[];
  fetchPool: (poolAddress: string) => Promise<PoolRouterContract.PoolInfo>;
  fetchAllPools: () => Promise<void>;
}

// ----------------------------------------------------------------------

export function usePools(): ReturnType {
  const store = useAppStore(); // Global state management
  const storePersist = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations
  const [allPools, setAllPools] = useState<PoolRouterContract.PoolInfo[]>([]); // State to hold pool data

  const rateLimitCheck = async () => {
    if (!storePersist.wallet.address) return;
    const res = await fetch('/api/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: storePersist.wallet.address }),
    });
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    const data = await res.json();
    if (!data.allowed) {
      throw new Error(data.error || 'Pool data access not allowed');
    }
  };

  const fetchPool = useCallback(async (poolAddress: string) => {
    try {
      await rateLimitCheck();

      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const pool = await PoolRouter.query_pool_details({ asset: '' });

      if (pool.result) {
        return pool.result;
      }
    } catch (e: any) {
      captureException(e);
      console.log(e);
      setError(e);
    }
    return undefined;
  }, []);

  const fetchAllPools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await rateLimitCheck();

      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.StellarConfig.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.StellarConfig.NETWORK_PASSPHRASE,
        rpcUrl: constants.StellarConfig.RPC_URL,
      });

      const pools = await PoolRouter.query_all_pools_details();

      if (pools.result) {
        setAllPools(pools.result as PoolRouterContract.PoolInfo[]);
      }

      setLoading(false);
    } catch (e) {
      captureException(e);
      console.error(e);
      setError(e as any);
      store.setLoading(false);
    } finally {
      store.setLoading(false);
    }
  }, []);

  // On component mount, fetch pool
  useEffect(() => {
    fetchAllPools();
  }, [fetchAllPools]);

  return {
    error,
    loading,
    pools: allPools,
    fetchPool,
    fetchAllPools,
  };
}

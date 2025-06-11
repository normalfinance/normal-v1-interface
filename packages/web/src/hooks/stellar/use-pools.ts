'use client';

import type { Pool } from '@normalfinance/contracts/build/pool';

import { useState, useEffect, useCallback } from 'react';
import { PoolRouterContract } from '@normalfinance/contracts';
import { constants, formatCurrency } from '@normalfinance/utils';
import { useAppStore, usePersistStore } from '@normalfinance/state';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  pools: Pool[];
  fetchPool: (poolAddress: string) => Promise<Pool>;
  fetchAllPools: () => Promise<void>;
}

// ----------------------------------------------------------------------

export function usePools(autoFetch: boolean): ReturnType {
  const store = useAppStore(); // Global state management
  const storePersist = usePersistStore();

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations
  const [allPools, setAllPools] = useState<Pool[]>([]); // State to hold pool data

  /**
   * Fetch pool information by its address.
   *
   * @async
   * @function fetchPool
   * @param {string} poolAddress - The address of the liquidity pool.
   * @returns {Promise<Pool | undefined>} A promise that resolves to the pool information or undefined in case of failure.
   */
  const fetchPool = useCallback(async (poolAddress: string) => {
    try {
      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const poolInfo = await PoolRouter.query_pool_details({ pool_address: poolAddress });

      if (poolInfo.result) {
        const [tokenA, tokenB] = await Promise.all([
          store.fetchTokenInfo(poolInfo.result.pool_response.asset_a.address),
          store.fetchTokenInfo(poolInfo.result.pool_response.asset_b.address),
        ]);

        // Fetch prices and calculate TVL

        const priceA =
          Number(poolInfo.result.pool_response.asset_b.amount) /
          Number(poolInfo.result.pool_response.asset_a.amount);

        const tvl =
          (priceA * Number(poolInfo.result.pool_response.asset_a.amount)) /
            10 ** Number(tokenA?.decimals) +
          Number(poolInfo.result.pool_response.asset_b.amount) / 10 ** Number(tokenB?.decimals);

        // Construct and return pool object if all fetches are successful
        return {
          tokens: [
            {
              name: tokenA?.symbol || '',
              icon: `/assets/icons/cryptoIcons/${tokenA?.symbol.toLowerCase()}.svg`,
              amount:
                Number(poolInfo.result.pool_response.asset_a.amount) /
                10 ** Number(tokenA?.decimals),
              category: '',
              usdValue: 0,
            },
            {
              name: tokenB?.symbol || '',
              icon: `/assets/icons/cryptoIcons/${tokenB?.symbol.toLowerCase()}.png`,
              amount:
                Number(poolInfo.result.pool_response.asset_b.amount) /
                10 ** Number(tokenB?.decimals),
              category: '',
              usdValue: 0,
            },
          ],
          tvl: formatCurrency('USD', tvl.toString(), navigator.language),
          // maxApr: `${(apr / 2).toFixed(2)}%`,
          maxApr: '0',
          userLiquidity: 0,
          poolAddress,
        };
      }
    } catch (e) {
      console.log(e);
      return undefined;
    }
  }, []);

  /**
   * Fetch all pools' data.
   *
   * @async
   * @function fetchPools
   */
  const fetchAllPools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const pools = await PoolRouter.query_all_pools_details();

      const poolWithData =
        pools && Array.isArray(pools.result)
          ? await Promise.all(
              pools.result.map(
                async (pool: PoolRouterContract.PoolInfo) => await fetchPool(pool.pool_address)
              )
            )
          : [];

      const poolsFiltered = poolWithData.filter(
        (el) =>
          el !== undefined &&
          el.tokens.length >= 2 &&
          el.poolAddress !== 'CBXBKAB6QIRUGTG77OQZHC46BIIPA5WDKIKZKPA2H7Q7CPKQ555W3EVB'
      );

      setAllPools(poolsFiltered as Pool[]);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError(e as any);
      store.setLoading(false);
    } finally {
      store.setLoading(false);
    }
  }, [fetchPool]);

  // On component mount, fetch pool
  useEffect(() => {
    if (autoFetch) fetchAllPools();
  }, [autoFetch, fetchAllPools]);

  return {
    error,
    loading,
    pools: allPools,
    fetchPool,
    fetchAllPools,
  };
}

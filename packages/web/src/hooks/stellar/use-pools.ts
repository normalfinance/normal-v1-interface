'use client';

import { constants } from '@normalfinance/utils';
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


  const fetchPool = useCallback(async (poolAddress: string) => {
    try {

      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const pool = await PoolRouter.query_pool_details({ pool_address: poolAddress });

      if (pool.result) {
        return pool.result;
      }
    } catch (e: any) {
      console.log(e);
      setError(e);
    }
    return undefined;
  }, []);

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

      if (pools.result) {
        // console.log(pools.result)
        setAllPools(pools.result as PoolRouterContract.PoolInfo[]);
      }

      setLoading(false);
    } catch (e) {
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

//  // LP token stuff..
//       // Get user share
//       if (storePersist.wallet.address) {
//         if (result) {
//           // Get the total amount of LP tokens in the pool

//           const lpShareAmount = Number(result.pool_response.asset_lp_share.amount);
//           const lpShareAmountDec = Number(lpShareAmount) / 10 ** (_lpToken?.decimals || 7);

//           // Get the amount of LP tokens the user has as balance or staked
//           const totalUserLPTokens =
//             Number(_lpToken!.balance || 0) / 10 ** (_lpToken?.decimals || 7);

//           // Price per Unit
//           const pricePerUnit = tvl / lpShareAmountDec;

//           // User share
//           setUserShare(totalUserLPTokens * pricePerUnit);
//         }
//       }

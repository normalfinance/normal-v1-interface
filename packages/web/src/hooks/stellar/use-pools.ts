'use client';

import { constants } from '@normalfinance/utils';
import { useAppStore } from '@normalfinance/state';
import { useState, useEffect, useCallback } from 'react';
import { PoolRouterContract } from '@normalfinance/contracts';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  pools: PoolRouterContract.PoolResponse[];
  fetchPool: (poolAddress: string) => Promise<PoolRouterContract.PoolInfo>;
  fetchAllPools: () => Promise<void>;
}

// ----------------------------------------------------------------------

export function usePools(autoFetch: boolean): ReturnType {
  const store = useAppStore(); // Global state management
 
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for async operations
  const [allPools, setAllPools] = useState<PoolRouterContract.PoolResponse[]>([]); // State to hold pool data

  const fetchPool = useCallback(async (poolAddress: string) => {
    try {
      const PoolRouter = new PoolRouterContract.Client({
        contractId: constants.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const pool = await PoolRouter.query_pool_details({ pool_address: poolAddress });

      if (pool.result) {
        const poolWithData = formatPool(pool.result);
      }
    } catch (e) {
      console.log(e);
      return undefined;
    }
  }, []);

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

  //  const poolsExplorerData: PoolDetails = {
  //     pairInfo: {
  //       tokenA: {
  //         name: 'USDC',
  //         iconUrl: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
  //       },
  //       tokenB: { name: 'ETH', iconUrl: 'https://token-icons.s3.amazonaws.com/eth.png' },
  //       address: '0x88e6...5640',
  //     },
  //     metadata: {
  //       version: 'v3',
  //       feeTier: '0.05%',
  //     },
  //     exchangeRate: {
  //       label: '1 WETH = 2,304.28 USDC',
  //       usdEquivalent: '$2,289.11',
  //       tokenSymbol: 'WETH',
  //       tokenRate: '2,304.28 USDC',
  //       tokenUSDValue: '$2,289.11',
  //     },
  //     performance: {
  //       percentageChange: 1.23,
  //     },
  //   };

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
        const poolsWithData = pools.result.map((pool: PoolRouterContract.PoolInfo) =>
          formatPool(pool)
        );

        setAllPools(poolsWithData as any[]);
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

const formatPool = (pool: PoolRouterContract.PoolInfo) => {
  const tokenAAmount = pool.pool_response.token_a.amount / 10 ** 7;
  const tokenBAmount = pool.pool_response.token_b.amount / 10 ** 7;

  // Construct and return pool object if all fetches are successful
  return {
    tokens: [
      {
        name: pool.pool_response.pool.base_asset,
        icon: `/assets/icons/cryptoIcons/n${pool.pool_response.pool.base_asset.toLowerCase()}.svg`,
        amount: tokenAAmount,

        usdValue: 0,
      },
      {
        name: pool.pool_response.pool.quote_asset,
        icon: `/assets/icons/cryptoIcons/${pool.pool_response.pool.quote_asset.toLowerCase()}.png`,
        amount: tokenBAmount,

        usdValue: 0,
      },
    ],
    tvl: '0',
    apr: '0',
    tokenShare: Number(pool.pool_response.token_share.amount) / 10 ** 7,
    address: pool.pool_address,
    poolInfo: pool.pool_response.pool,
  };
};

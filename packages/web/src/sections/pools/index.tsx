'use client';

import type { Pool } from '@/components/_common/pools';

import { useRouter } from 'next/navigation';
import { constants } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useState, useEffect, useCallback } from 'react';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { formatCurrency } from '@normalfinance/utils/build/stellar';
import { PoolsTemp } from '@/components/_pools-page-components/pools-temp';
import { NormalPoolContract, NormalPoolRouterContract } from '@normalfinance/contracts';
import Grid2 from '@mui/material/Grid2';
import { PoolsApr, PoolBalance, PoolStat } from '@/components/_common//pools-apr/pools-apr';

// import Grid2 from '@mui/material/Grid2';
import { Grid, Stack, Typography } from '@mui/material';

export default function PoolsView() {
  const store = useAppStore(); // Global state management
  const router = useRouter(); // Next.js router
  const [loading, setLoading] = useState(true); // Loading state for async operations
  const [allPools, setAllPools] = useState<Pool[]>([]); // State to hold pool data
  const storePersist = usePersistStore(); // Persisted state
  const appStore = useAppStore();

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
      const PoolContract = new NormalPoolContract.Client({
        contractId: poolAddress,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const poolInfo = await PoolContract.get_info();

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
    }
    // eslint-disable-next-line consistent-return
    return;
  }, []);

  /**
   * Fetch all pools' data.
   *
   * @async
   * @function fetchPools
   */
  const fetchPools = useCallback(async () => {
    try {
      const PoolRouterContract = new NormalPoolRouterContract.Client({
        contractId: constants.POOL_ROUTER_ADDRESS,
        networkPassphrase: constants.NETWORK_PASSPHRASE,
        rpcUrl: constants.RPC_URL,
      });

      const pools = await PoolRouterContract.query_all_pools_details();

      const poolWithData =
        pools && Array.isArray(pools.result)
          ? await Promise.all(pools.result.map(async (pool) => await fetchPool(pool.pool_address)))
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
      appStore.setLoading(false);
    } finally {
      appStore.setLoading(false);
    }
  }, [fetchPool]);

  // On component mount, fetch pools
  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  console.log(allPools);

  const TOTAL_APR_PERCENTAGE = 88.93;

  // 👉 pool balances (exactly two coins)
  const POOL_BALANCES: [PoolBalance, PoolBalance] = [
    { coinShortName: 'USDC', value: 68700000 },
    { coinShortName: 'ETH', value: 19800000 },
  ];

  // 👉 stats list
  const POOL_STATS: PoolStat[] = [
    { statName: 'TVL', value: 114500000, percentage: 13.39 },
    { statName: '24H volume', value: 557900000, percentage: -12.11 },
    { statName: 'Liquidity', value: 123456 },
  ];

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          Pools
        </Typography>
      </Stack>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <PoolsTemp
          pools={allPools}
          onAddLiquidityClick={() => {}}
          onShowDetailsClick={(pool) => {
            router.push(`/pools/${pool.poolAddress}`);
          }}
        />
      </Grid2>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <PoolsApr
            totalAprPercentage={TOTAL_APR_PERCENTAGE}
            poolBalances={POOL_BALANCES}
            stats={POOL_STATS}
          />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

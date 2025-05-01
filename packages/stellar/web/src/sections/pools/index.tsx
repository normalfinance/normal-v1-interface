'use client';

import type { Pool } from '@/components/_common/pools';

import { useRouter } from 'next/navigation';
import Pools from '@/components/_common/pools';
import { constants } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useState, useEffect, useCallback } from 'react';
import { useAppStore, usePersistStore } from '@/state/store';
import { NormalPoolContract, NormalPoolRouterContract } from '@normalfinance/stellar-contracts';

import Grid2 from '@mui/material/Grid2';
import { Stack, Typography } from '@mui/material';

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
        networkPassphrase: constants.SOROBAN_NETWORK_PASSPHRASE,
        rpcUrl: constants.SOROBAN_RPC_URL,
      });

      const poolInfo = await PoolContract.get_info();
      const poolTokens = await PoolContract.get_tokens();
      const poolReserves = await PoolContract.get_reserves();
      const poolTotalShares = await PoolContract.get_total_shares();

      if (poolInfo?.result) {
        const [tokenA, tokenB] = await Promise.all([
          store.fetchTokenInfo(poolTokens.result[0]),
          store.fetchTokenInfo(poolTokens.result[1]),
        ]);

        // Fetch prices and calculate TVL
        const [priceA, priceB] = await Promise.all([
          API.getPrice(tokenA?.symbol || ''),
          API.getPrice(tokenB?.symbol || ''),
        ]);

        const tvl =
          (priceA * Number(poolReserves.result[0])) / 10 ** Number(tokenA?.decimals) +
          (priceB * Number(poolReserves.result[1])) / 10 ** Number(tokenB?.decimals);

        const totalStaked = Number(stakingInfo.result);
        const totalTokens = Number(
          allPoolDetails.result.find((pool: any) => pool.pool_address === poolAddress)
            ?.pool_response.asset_lp_share.amount
        );

        const ratioStaked = totalStaked / totalTokens;
        const valueStaked = tvl * ratioStaked;

        // Calculate APR based on incentives
        const poolIncentives = [
          {
            address: 'CBHCRSVX3ZZ7EGTSYMKPEFGZNWRVCSESQR3UABET4MIW52N4EVU6BIZX',
            amount: 12500,
          },
        ];

        const poolIncentive = poolIncentives.find((incentive) => incentive.address === poolAddress);

        const phoprice = await fetchPho();
        const _apr = ((poolIncentive?.amount || 0 * phoprice) / valueStaked) * 100 * 6;

        const apr = isNaN(_apr) ? 0 : _apr;

        // Construct and return pool object if all fetches are successful
        return {
          tokens: [
            {
              name: tokenA?.symbol || '',
              icon: `/cryptoIcons/${tokenA?.symbol.toLowerCase()}.svg`,
              amount: Number(poolReserves.result[0]) / 10 ** Number(tokenA?.decimals),
              category: '',
              usdValue: 0,
            },
            {
              name: tokenB?.symbol || '',
              icon: `/cryptoIcons/${tokenB?.symbol.toLowerCase()}.svg`,
              amount: Number(poolReserves.result[1]) / 10 ** Number(tokenB?.decimals),
              category: '',
              usdValue: 0,
            },
          ],
          tvl: formatCurrency('USD', tvl.toString(), navigator.language),
          maxApr: `${(apr / 2).toFixed(2)}%`,
          userLiquidity: 0,
          poolAddress,
        };
      }
    } catch (e) {
      console.log(e);
    }
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
        networkPassphrase: constants.SOROBAN_NETWORK_PASSPHRASE,
        rpcUrl: constants.SOROBAN_RPC_URL,
      });

      const pools = await PoolRouterContract.get_pools_for_tokens_range({
        start: BigInt(0),
        end: BigInt(10),
      });

      const poolWithData =
        pools && Array.isArray(pools.result)
          ? await Promise.all(pools.result.map(async (pool: string) => await fetchPool(pool)))
          : [];

      const poolsFiltered: Pool[] = poolWithData.filter(
        (el: any) =>
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

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          Pools
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Account Overview
        </Typography>
      </Stack>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Pools
            pools={allPools}
            onAddLiquidityClick={() => {}}
            onShowDetailsClick={(pool) => {
              router.push(`/pools/${pool.poolAddress}`);
            }}
          />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

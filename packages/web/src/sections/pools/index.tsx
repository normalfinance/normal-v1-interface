'use client';

import type { PoolTxRow } from '@/types/pools';
import type { LegendValue } from '@/components/_common/area-chart-card';
import type { RealtimeChartData } from '@/utils/portfolio-value-chart-series';
import type { PoolStat, PoolBalance } from '@/components/_common//pools-apr/pools-apr';
import type { ExplorerChartData } from '@/components/_common/pools-explore/pools-explore';
import type { PoolDetails } from '@/components/_common/pools-explore/explorer-chart-data';

import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { constants } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useState, useEffect, useCallback } from 'react';
import { fCurrencyCompact } from '@/utils/format-number';
import { getCryptoIconUrl } from '@/utils/get-crypto-icon';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { formatCurrency } from '@normalfinance/utils/build/stellar';
import { createChartData } from '@/utils/portfolio-value-chart-series';
import { NormalPoolContract, NormalPoolRouterContract } from '@normalfinance/contracts';

import Grid2 from '@mui/material/Grid2';
import { useTheme } from '@mui/material';
// import Grid2 from '@mui/material/Grid2';
import { Stack, Typography } from '@mui/material';

import { PoolsApr } from '@/components/_common//pools-apr/pools-apr';
import PoolsTable from '@/components/_common/pools-table/pools-table';
import { PoolsTemp } from '@/components/_pools-page-components/pools-temp';
import { PoolsExplorer } from '@/components/_common/pools-explore/pools-explore';

export default function PoolsView() {
  const { t } = useTranslate();
  const theme = useTheme();
  const store = useAppStore(); // Global state management
  const router = useRouter(); // Next.js router
  const [loading, setLoading] = useState(true); // Loading state for async operations
  const [allPools, setAllPools] = useState<any[]>([]); // State to hold pool data
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
              icon: getCryptoIconUrl(tokenA?.symbol || ''),
              amount:
                Number(poolInfo.result.pool_response.asset_a.amount) /
                10 ** Number(tokenA?.decimals),
              category: '',
              usdValue: 0,
            },
            {
              name: tokenB?.symbol || '',
              icon: getCryptoIconUrl(tokenB?.symbol || ''),
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
          ? await Promise.all(
              pools.result.map(async (pool: any) => await fetchPool(pool.poolAddress))
            )
          : [];

      const poolsFiltered = poolWithData.filter(
        (el: any) =>
          el !== undefined &&
          el.tokens.length >= 2 &&
          el.poolAddress !== 'CBXBKAB6QIRUGTG77OQZHC46BIIPA5WDKIKZKPA2H7Q7CPKQ555W3EVB'
      );

      setAllPools(poolsFiltered as any[]);
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

  const MOCK_POOL_TXS: PoolTxRow[] = [
    {
      timestamp: Date.now() / 1000 - 45,
      type: 'Buy',
      usdValue: 32000,
      usdcValue: 31990,
      ethValue: 10.24,
      wallet: 'GABCD…1234',
    },
    {
      timestamp: Date.now() / 1000 - 90,
      type: 'Sell',
      usdValue: 21000,
      usdcValue: 20990,
      ethValue: 6.75,
      wallet: 'GXYZ…9876',
    },
    {
      timestamp: Date.now() / 1000 - 180,
      type: 'Mint',
      usdValue: 50000,
      usdcValue: 49980,
      ethValue: 15.0,
      wallet: 'G123…ABCD',
    },
    {
      timestamp: Date.now() / 1000 - 300,
      type: 'Redeem',
      usdValue: 15000,
      usdcValue: 14990,
      ethValue: 4.5,
      wallet: 'G777…4444',
    },
    {
      timestamp: Date.now() / 1000 - 380,
      type: 'Mint',
      usdValue: 50000,
      usdcValue: 49980,
      ethValue: 15.0,
      wallet: 'G123…ABCD',
    },
  ];

  const data24h = [
    3444, 3600, 3750, 3900, 4100, 4300, 4500, 4700, 4900, 5200, 5400, 5500, 5650, 5800, 6000, 6200,
    6400, 6600, 6800, 7000, 7200, 7300, 7320, 7334,
  ];
  const data7d = [3444, 4000, 4800, 8200, 5800, 6800, 7334];
  const data30d = [
    3444, 3500, 3600, 3700, 3800, 3900, 4000, 4200, 4300, 4400, 4500, 4600, 4800, 5000, 5200, 5400,
    5600, 5800, 6000, 6200, 6400, 6600, 6800, 7000, 7100, 7200, 7250, 7300, 7320, 7330, 7334,
  ];
  // Hardcoded 12 month data

  // Create chart data objects using our helper.
  const chartData24h: RealtimeChartData = createChartData('24h', data24h, 8);
  const chartData7d: RealtimeChartData = createChartData('7d', data7d, 7);
  const chartData30d: RealtimeChartData = createChartData('30d', data30d, 8);

  // Combine chart data into one object.
  const portfolioChartData: { [key in '24h' | '7d' | '30d']: RealtimeChartData } = {
    '24h': chartData24h,
    '7d': chartData7d,
    '30d': chartData30d,
  };

  const myLegendValues: LegendValue[] = [
    { title: 'Balance', number: 7334, formatter: fCurrencyCompact },
  ];

  // Price data samples
  const priceData24h = Array.from({ length: 24 }, (_, i) => 1000 + i * 5);
  const priceData7d = Array.from({ length: 7 }, (_, i) => 1100 + i * 20);
  const priceData30d = Array.from({ length: 31 }, (_, i) => 1050 + i * 10);
  const priceData12m = Array.from({ length: 12 }, (_, i) => 950 + i * 50);

  // Volume data samples
  const volumeData24h = Array.from({ length: 24 }, (_, i) => 5000 + i * 100);
  const volumeData7d = Array.from({ length: 7 }, (_, i) => 10000 + i * 200);
  const volumeData30d = Array.from({ length: 31 }, (_, i) => 15000 + i * 150);
  const volumeData12m = Array.from({ length: 12 }, (_, i) => 20000 + i * 500);

  // Liquidity data samples
  const liquidityData24h = Array.from({ length: 24 }, (_, i) => 75000 + i * 300);
  const liquidityData7d = Array.from({ length: 7 }, (_, i) => 80000 + i * 600);
  const liquidityData30d = Array.from({ length: 31 }, (_, i) => 85000 + i * 400);
  const liquidityData12m = Array.from({ length: 12 }, (_, i) => 90000 + i * 1000);

  const poolChartData: ExplorerChartData = {
    price: {
      '24h': createChartData('24h', priceData24h, 8),
      '7d': createChartData('7d', priceData7d, 7),
      '30d': createChartData('30d', priceData30d, 8),
      '12m': createChartData('12m', priceData12m, 12),
    },
    volume: {
      '24h': createChartData('24h', volumeData24h, 8),
      '7d': createChartData('7d', volumeData7d, 7),
      '30d': createChartData('30d', volumeData30d, 8),
      '12m': createChartData('12m', volumeData12m, 12),
    },
    liquidity: {
      '24h': createChartData('24h', liquidityData24h, 8),
      '7d': createChartData('7d', liquidityData7d, 7),
      '30d': createChartData('30d', liquidityData30d, 8),
      '12m': createChartData('12m', liquidityData12m, 12),
    },
  };

  const poolsExplorerData: PoolDetails = {
    pairInfo: {
      tokenA: {
        name: 'USDC',
        iconUrl: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
      },
      tokenB: { name: 'ETH', iconUrl: 'https://token-icons.s3.amazonaws.com/eth.png' },
      address: '0x88e6...5640',
    },
    metadata: {
      version: 'v3',
      feeTier: '0.05%',
    },
    exchangeRate: {
      label: '1 WETH = 2,304.28 USDC',
      usdEquivalent: '$2,289.11',
      tokenSymbol: 'WETH',
      tokenRate: '2,304.28 USDC',
      tokenUSDValue: '$2,289.11',
    },
    performance: {
      percentageChange: 1.23,
    },
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          {t('Pools')}
        </Typography>
      </Stack>

      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <PoolsExplorer
            id="portfolio_value"
            pairInfo={poolsExplorerData.pairInfo}
            metadata={poolsExplorerData.metadata}
            exchangeRate={poolsExplorerData.exchangeRate}
            performance={poolsExplorerData.performance}
            legendValues={[{ title: 'Price', number: 7334, formatter: fCurrencyCompact }]}
            chart={poolChartData}
            color={theme.palette.primary.main}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <PoolsApr
            totalAprPercentage={TOTAL_APR_PERCENTAGE}
            poolBalances={POOL_BALANCES}
            stats={POOL_STATS}
          />
        </Grid2>
      </Grid2>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 12 }}>
          <PoolsTable rows={MOCK_POOL_TXS} />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

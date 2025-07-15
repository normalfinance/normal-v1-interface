'use client';

import type { ExplorerChartData } from '@/components/_pool-page-components';

import { useTranslate } from '@/locales';
import { usePool } from '@/hooks/stellar/use-pool';
import { DashboardContent } from '@/layouts/dashboard';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { fPercent, fCurrencyCompact } from '@/utils/format-number';
import { createChartData } from '@/utils/portfolio-value-chart-series';

import { Alert, Stack, Grid2, useTheme, Typography, CircularProgress } from '@mui/material';

import { PoolOverview } from '@/components/_pool-page-components/pool-overview';
import { PoolChart } from '@/components/_pool-page-components/pool-chart/pool-chart';
import { PoolTransactionsTable } from '@/components/_pool-page-components/pool-transactions-table';

export default function PoolView({ poolAddress }: { poolAddress: string }) {
  const theme = useTheme();
  const { t } = useTranslate();

  const {
    loading: loadingPool,
    error: poolError,
    pool,
    recentTransactions,
  } = usePool(poolAddress, 10);

  // TODO:
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
  };

  if (loadingPool) {
    <CircularProgress />;
  }

  if (!poolAddress || pool == undefined) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="info">{`The pool you're looking for doesn't exist.`}</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          {t('Pool')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {poolAddress}
        </Typography>
      </Stack>

      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <PoolChart
            id="portfolio_value"
            pairInfo={{
              tokenA: {
                name: pool.pool_response.pool.base_asset,
                iconUrl: getCryptoIconUrl(pool.pool_response.pool.base_asset),
              },
              tokenB: {
                name: pool.pool_response.pool.quote_asset,
                iconUrl: getCryptoIconUrl(pool.pool_response.pool.quote_asset),
              },
              address: poolAddress,
            }}
            metadata={{
              version: 'v1',
              feeTier: fPercent(pool.pool_response.pool.fee_fraction / 100),
            }}
            exchangeRate={{
              label: `1 ${pool.pool_response.pool.base_asset} = 2,304.28 ${pool.pool_response.pool.quote_asset}`,
              usdEquivalent: '$2,289.11',
              tokenSymbol: pool.pool_response.pool.base_asset,
              tokenRate: `2,304.28 ${pool.pool_response.pool.quote_asset}`,
              tokenUSDValue: '$2,289.11',
            }}
            performance={{ percentageChange: 0 }}
            legendValues={[{ title: 'Price', number: 7334, formatter: fCurrencyCompact }]}
            chart={poolChartData}
            color={theme.palette.primary.main}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <PoolOverview
            totalAprPercentage={0}
            poolBalances={[
              {
                coinShortName: pool.pool_response.pool.base_asset,
                value: Number(pool.pool_response.token_a.amount) / 10 ** 7,
              },
              {
                coinShortName: pool.pool_response.pool.quote_asset,
                value: Number(pool.pool_response.token_b.amount) / 10 ** 7,
              },
            ]}
            stats={[
              { statName: 'TVL', value: 0 },
              { statName: '24h Volume', value: 0 },
              { statName: '24h Fees', value: 0 },
            ]}
          />
        </Grid2>
      </Grid2>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 12 }}>
          <PoolTransactionsTable
            baseTokenSymbol={pool.pool_response.pool.base_asset}
            quoteTokenSymbol={pool.pool_response.pool.quote_asset}
            rows={recentTransactions ?? []}
          />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

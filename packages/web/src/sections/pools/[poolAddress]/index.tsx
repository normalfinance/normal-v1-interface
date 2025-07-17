'use client';


import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { usePool, usePoolEvents, useSwapVolume } from '@/hooks';
import { fPercent, fCurrencyCompact } from '@/utils/format-number';
import { createChartData } from '@/utils/portfolio-value-chart-series';
import { usePoolPriceChart } from '@/hooks/stellar/events/use-pool-price-chart';
import { usePoolPriceChartv2 } from '@/hooks/stellar/events/use-pool-price-chart copy';

import { Alert, Stack, Grid2, useTheme, Typography, CircularProgress } from '@mui/material';

import { PoolOverview } from '@/components/_pool-page-components/pool-overview';
import { PoolChart } from '@/components/_pool-page-components/pool-chart/pool-chart';
import { PoolTransactionsTable } from '@/components/_pool-page-components/pool-transactions-table';

export default function PoolView({ poolAddress }: { poolAddress: string }) {
  const theme = useTheme();
  const { t } = useTranslate();

  const { loading: loadingPool, error: poolError, pool, recentTransactions } = usePool(poolAddress);
  const {} = usePoolEvents(poolAddress, 10);
  const { getSwapVolume } = useSwapVolume();
  const pricePoints = usePoolPriceChart(poolAddress);
  const { chartData } = usePoolPriceChartv2(poolAddress);

  const [volume, setVolume] = useState<{
    '24h': any;
    '7d': any;
    '30d': any;
    '12m': any;
  }>({
    '24h': null,
    '7d': null,
    '30d': null,
    '12m': null,
  });

  useEffect(() => {
    const fetchAllVolumes = async () => {
      const [v24h, v7d, v30d, v12m] = await Promise.all([
        getSwapVolume({ timeframe: '1d', poolAddress }),
        getSwapVolume({ timeframe: '7d', poolAddress }),
        getSwapVolume({ timeframe: '30d', poolAddress }),
        getSwapVolume({ timeframe: '12m', poolAddress }),
      ]);

      setVolume({
        '24h': createChartData('24h', v24h, 8),
        '7d': createChartData('7d', v7d, 7),
        '30d': createChartData('30d', v30d, 8),
        '12m': createChartData('12m', v12m, 12),
      });
    };

    fetchAllVolumes();
  }, []);

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
            chart={chartData}
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
              { statName: '24h Volume', value: volume['24h'] ?? 0 },
              { statName: '24h Fees', value: volume['24h'] ? volume['24h'] * 0.03 : 0 },
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

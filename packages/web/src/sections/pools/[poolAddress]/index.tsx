'use client';

import type { PoolTxRow } from '@/types/pools';
import type { events } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { fPercent } from '@/utils/format-number';
import { DashboardContent } from '@/layouts/dashboard';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { usePool, usePoolEvents, usePoolPriceChart } from '@/hooks';
// import { usePoolPriceChart } from '@/hooks/stellar/events/use-pool-price-chart';
// import { usePoolPriceChartv2 } from '@/hooks/stellar/events/use-pool-price-chart-v2';

import { Alert, Stack, Grid2, useTheme, Typography, CircularProgress } from '@mui/material';

import { PoolOverview } from '@/components/_pool-page-components/pool-overview';
import { PoolChart } from '@/components/_pool-page-components/pool-chart/pool-chart';
import { PoolTransactionsTable } from '@/components/_pool-page-components/pool-transactions-table';

function convertToPoolTxRow(event: events.PoolEvent): PoolTxRow {
  switch (event.type) {
    case 'deposit_liquidity':
      return {
        type: 'Deposit',
        tokenAAmount: Number(event.amount) / 1e6,
        tokenBAmount: 0,
        user: event.user,
        timestamp: event.timestamp,
        txHash: event.txHash,
      };

    case 'withdraw_liquidity':
      return {
        type: 'Withdraw',
        tokenAAmount: Number(event.amount) / 1e6,
        tokenBAmount: 0,
        user: event.user,
        timestamp: event.timestamp,
        txHash: event.txHash,
      };

    case 'swap': {
      const isBuy = event.direction === 'buy';
      return {
        type: isBuy ? 'Buy' : 'Sell',
        tokenAAmount: isBuy ? Number(event.inAmount) / 1e6 : Number(event.outAmount) / 1e6,
        tokenBAmount: isBuy ? Number(event.outAmount) / 1e6 : Number(event.inAmount) / 1e6,
        user: event.user,
        timestamp: event.timestamp,
        txHash: event.txHash,
      };
    }

    default:
      throw new Error(`Unsupported pool event type: ${event.type}`);
  }
}

export default function PoolView({ poolAddress }: { poolAddress: string }) {
  const theme = useTheme();
  const { t } = useTranslate();

  const { loading, error, pool } = usePool(poolAddress);
  const { events } = usePoolEvents(poolAddress);
  const { chartData } = usePoolPriceChart(poolAddress);

  // const sum = chartData.volume?.['24h']?.series[0].data;

  const rows = events
    .map(convertToPoolTxRow)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  if (loading) {
    <CircularProgress />;
  }

  if (!poolAddress || pool == undefined) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="info">{t("The pool you're looking for doesn't exist.")}</Alert>
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
            rows={rows}
          />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

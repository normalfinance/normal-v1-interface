'use client';

import type { PoolTxRow } from '@/types/pools';
import type { events } from '@normalfinance/types';

import BigNumber from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { useAppStore } from '@normalfinance/state';
import { DashboardContent } from '@/layouts/dashboard';
import { fPercent, fCurrency } from '@/utils/format-number';
import { format, getCryptoIconUrl } from '@normalfinance/utils';
import { usePool, usePoolEvents, useSwapVolume, useTokenPrice, usePoolPriceChart } from '@/hooks';

import { Alert, Stack, Grid2, useTheme, Typography } from '@mui/material';

import { PoolOverview } from '@/components/_pool-page-components/pool-overview';
import { PoolChart } from '@/components/_pool-page-components/pool-chart/pool-chart';
import { PoolTransactionsTable } from '@/components/_pool-page-components/pool-transactions-table';

export default function PoolView({ asset }: { asset: string }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const { tokens } = useAppStore();

  // Load the pool
  const { loading: poolLoading, error: poolError, pool } = usePool(asset);

  // Load XLM price
  const { loading: priceLoading, price: xlmPrice } = useTokenPrice('XLM');

  // Load price and volume chart data
  const { chartData } = usePoolPriceChart(pool?.pool_address);

  // Load recent pool events
  const { events } = usePoolEvents(pool?.pool_address, 20);

  // Format the pool events
  const rows = events
    .map(convertToPoolTxRow)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  // Load the past 24h volume
  const { getSwapVolume } = useSwapVolume();

  const [past24hVolume, setPast24hVolume] = useState<BigNumber | undefined>(undefined);

  useEffect(() => {
    getSwapVolume({ timeframe: '24h', poolAddress: pool?.pool_address }).then((res) =>
      setPast24hVolume(BigNumber(res['24h'].volume))
    );
  }, []);

  // Load pool price and exchange rate info
  const [poolPrice, setPoolPrice] = useState<BigNumber | undefined>(undefined);
  const [tokenUSDValue, setTokenUSDValue] = useState<BigNumber | undefined>(undefined);
  const [reserveFiatValues, setReserveFiatValues] = useState<
    { token_a: BigNumber; token_b: BigNumber } | undefined
  >(undefined);
  const [tvl, setTvl] = useState<BigNumber | undefined>(undefined);

  useEffect(() => {
    if (pool && xlmPrice) {
      const reserve_a = BigNumber(format.formatTokenAmount(pool.pool_response.token_a.amount));
      const reserve_b = BigNumber(format.formatTokenAmount(pool.pool_response.token_b.amount));

      const pool_price = reserve_b.div(reserve_a);
      setPoolPrice(pool_price);

      const xlm_price = BigNumber(format.formatTokenAmount(xlmPrice, 14));
      setTokenUSDValue(pool_price.multipliedBy(xlm_price));

      const reserve_b_value = reserve_b.multipliedBy(xlm_price);
      const reserve_a_value = pool_price.multipliedBy(reserve_a).multipliedBy(xlm_price);
      setReserveFiatValues({
        token_a: reserve_a_value,
        token_b: reserve_b_value,
      });

      setTvl(reserve_a_value.plus(reserve_b_value));
    }
  }, [pool, xlmPrice]);

  if (poolError != null) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="info">{t('There was an error loading this pool.')}</Alert>
      </DashboardContent>
    );
  }

  if (!pool || pool == undefined) {
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
          {pool.pool_address}
        </Typography>
      </Stack>

      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <PoolChart
            pairInfo={{
              tokenA: {
                name: `n${pool.pool_response.pool.base_asset}`,
                iconUrl: getCryptoIconUrl(pool.pool_response.pool.base_asset),
              },
              tokenB: {
                name: pool.pool_response.pool.quote_asset,
                iconUrl: getCryptoIconUrl(pool.pool_response.pool.quote_asset),
              },
              address: pool.pool_address,
            }}
            metadata={{
              version: 'v1',
              feeTier: fPercent(pool.pool_response.pool.fee_fraction / 100),
            }}
            exchangeRate={{
              label: `1 n${pool.pool_response.pool.base_asset} = ${poolPrice?.toFixed(4)} ${pool.pool_response.pool.quote_asset}`,
              usdEquivalent: fCurrency(tokenUSDValue ? tokenUSDValue.toFixed(2) : 0),
              tokenSymbol: `n${pool.pool_response.pool.base_asset}`,
              tokenRate: `${poolPrice?.toFixed(4)} ${pool.pool_response.pool.quote_asset}`,
              tokenUSDValue: fCurrency(tokenUSDValue ? tokenUSDValue.toFixed(2) : 0),
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
                tokenSymbol: `n${pool.pool_response.pool.base_asset}`,
                amount: BigNumber(pool.pool_response.token_a.amount),
                fiatValue: reserveFiatValues ? reserveFiatValues.token_a : BigNumber(0),
              },
              {
                tokenSymbol: pool.pool_response.pool.quote_asset,
                amount: BigNumber(pool.pool_response.token_b.amount),
                fiatValue: reserveFiatValues ? reserveFiatValues.token_b : BigNumber(0),
              },
            ]}
            stats={[
              { statName: 'TVL', value: tvl ?? BigNumber(0) },
              { statName: '24h Volume', value: past24hVolume ?? BigNumber(0) },
              {
                statName: '24h Fees',
                value: past24hVolume
                  ? past24hVolume.multipliedBy(300 / 10000).dividedBy(2)
                  : BigNumber(0),
              },
            ]}
            tokens={tokens}
          />
        </Grid2>
      </Grid2>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 12 }}>
          <PoolTransactionsTable
            baseTokenSymbol={`n${pool.pool_response.pool.base_asset}`}
            quoteTokenSymbol={pool.pool_response.pool.quote_asset}
            rows={rows}
            xlmPrice={xlmPrice ? Number(format.formatTokenAmount(xlmPrice, 14)) : 0}
          />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

function convertToPoolTxRow(event: events.PoolRouterEvent): PoolTxRow {
  switch (event.type) {
    case 'deposit_liquidity':
      return {
        type: 'Deposit',
        tokenAAmount: 0,
        tokenBAmount: Number(format.formatTokenAmount(event.amount.toString())),
        user: event.user,
        timestamp: event.timestamp || 0,
        txHash: event.txHash,
      };

    case 'withdraw_liquidity':
      return {
        type: 'Withdraw',
        tokenAAmount: 0,
        tokenBAmount: Number(format.formatTokenAmount(event.amount.toString())),
        user: event.user,
        timestamp: event.timestamp || 0,
        txHash: event.txHash,
      };

    case 'swap': {
      const isBuy = event.direction === 'buy';
      return {
        type: isBuy ? 'Buy' : 'Sell',
        tokenAAmount: isBuy
          ? Number(format.formatTokenAmount(event.inAmount.toString()))
          : Number(format.formatTokenAmount(event.outAmount.toString())),
        tokenBAmount: isBuy
          ? Number(format.formatTokenAmount(event.outAmount.toString()))
          : Number(format.formatTokenAmount(event.inAmount.toString())),
        user: event.user,
        timestamp: event.timestamp || 0,
        txHash: event.txHash,
      };
    }

    default:
      throw new Error(`Unsupported pool event type: ${event.type}`);
  }
}

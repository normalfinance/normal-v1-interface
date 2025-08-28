'use client';

import type { PoolTxRow } from '@/types/pools';
import type { events } from '@normalfinance/types';
import type { PoolInfo } from '@normalfinance/contracts/build/insurance_fund';

import BigNumber from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { useAppStore } from '@normalfinance/state';
import { DashboardContent } from '@/layouts/dashboard';
import { fPercent, fCurrency } from '@/utils/format-number';
import { format, getCryptoIconUrl } from '@normalfinance/utils';
import { usePoolEvents, useSwapVolume, useTokenPrice, usePoolPriceChart } from '@/hooks';

import { Stack, Grid2, useTheme, Typography } from '@mui/material';

import { PoolOverview } from '@/components/_pool-page-components/pool-overview';
import { PoolChart } from '@/components/_pool-page-components/pool-chart/pool-chart';
import { PoolTransactionsTable } from '@/components/_pool-page-components/pool-transactions-table';

export default function PoolDetailsView({ asset, pool }: { asset: string; pool: PoolInfo }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const { tokens } = useAppStore();

  // Load XLM price
  const { loading: priceLoading, price: xlmPrice } = useTokenPrice('XLM');

  // Load price and volume chart data
  const { chartData } = usePoolPriceChart(asset);

  // Load recent pool events
  const { events } = usePoolEvents(pool.pool_address, 20);

  // Format the pool events
  const rows = events
    .map(convertToPoolTxRow)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  // Load the past 24h volume
  const { getSwapVolume } = useSwapVolume();

  const [past24hVolume, setPast24hVolume] = useState<BigNumber>(BigNumber(0));

  useEffect(() => {
    getSwapVolume({ asset }).then((res) => setPast24hVolume(BigNumber(res['24h'].volume)));
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

      if (reserve_a.eq(0) || reserve_b.eq(0)) return;

      const pool_price = reserve_b.div(reserve_a);
      setPoolPrice(pool_price);

      setTokenUSDValue(pool_price.multipliedBy(xlmPrice));

      const reserve_b_value = reserve_b.multipliedBy(xlmPrice);
      const reserve_a_value = pool_price.multipliedBy(reserve_a).multipliedBy(xlmPrice);
      setReserveFiatValues({
        token_a: reserve_a_value,
        token_b: reserve_b_value,
      });

      setTvl(reserve_a_value.plus(reserve_b_value));
    }
  }, [pool, xlmPrice]);

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
            baseTokenSymbol={format.formatNormalToken(pool.pool_response.pool.base_asset, 'with-n')}
            quoteTokenSymbol={pool.pool_response.pool.quote_asset}
            rows={rows}
            xlmPrice={xlmPrice}
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
        tokenAAmount: BigNumber(event.delta_a),
        tokenBAmount: BigNumber(event.amount),
        user: event.user,
        timestamp: event.timestamp || 0,
        txHash: event.txHash,
      };

    case 'withdraw_liquidity':
      return {
        type: 'Withdraw',
        tokenAAmount: BigNumber(event.delta_a),
        tokenBAmount: BigNumber(event.amount),
        user: event.user,
        timestamp: event.timestamp || 0,
        txHash: event.txHash,
      };

    case 'swap': {
      const isBuy = event.direction === 'Buy';
      return {
        type: isBuy ? 'Buy' : 'Sell',
        tokenAAmount: BigNumber(isBuy ? event.outAmount : event.inAmount),
        tokenBAmount: BigNumber(isBuy ? event.inAmount : event.outAmount),
        user: event.user,
        timestamp: event.timestamp || 0,
        txHash: event.txHash,
      };
    }

    default:
      throw new Error(`Unsupported pool event type: ${event.type}`);
  }
}

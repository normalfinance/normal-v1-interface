'use client';

import type { PoolTxRow } from '@/types/pools';
import type { events, Pool } from '@normalfinance/types';

import { useState } from 'react';
import BigNumber from 'bignumber.js';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { usePoolEvents, usePoolPriceChart } from '@/hooks';
import { fPercent, fCurrency } from '@/utils/format-number';

import { Grid2, useTheme } from '@mui/material';

import { PoolOverview } from '@/components/_pool-page-components/pool-overview';
import { PoolChart } from '@/components/_pool-page-components/pool-chart/pool-chart';
import { PoolTransactionsTable } from '@/components/_pool-page-components/pool-transactions-table';

export default function PoolDetailsView({ pool }: { pool: Pool }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const {
    tokenState: { tokens },
  } = usePersistStore();

  const tokenA = tokens.find((tkn) => tkn.contract === pool.tokenA)!;
  const tokenB = tokens.find((tkn) => tkn.contract === pool.tokenB)!;

  // Load recent pool events
  const { events } = usePoolEvents(pool.address, 20);

  // Format the pool events
  const rows = events
    .map(convertToPoolTxRow)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  // Load price and volume chart data
  const { chartData } = usePoolPriceChart(pool.address, []);

  // Load pool price and exchange rate info
  const [tokenUSDValue, setTokenUSDValue] = useState<BigNumber>(BigNumber(0));
  const [reserveFiatValues, setReserveFiatValues] = useState<{
    token_a: BigNumber;
    token_b: BigNumber;
  }>({ token_a: BigNumber(0), token_b: BigNumber(0) });

  const past24hVolume = BigNumber(0);
  const tvl = BigNumber(0);

  return (
    <DashboardContent maxWidth="xl">
      <Grid2 container spacing={3}>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <PoolChart
            pairInfo={{
              tokenA,
              tokenB,
              address: pool.address,
            }}
            metadata={{
              version: 'v1',
              feeTier: fPercent(pool.feeFraction / 100),
            }}
            exchangeRate={{
              label: `1 ${tokenA.symbol} = ${pool.prices.tokenA.toFixed(4)} ${tokenB.symbol}`,
              usdEquivalent: fCurrency(tokenUSDValue.toFixed(2)),
              tokenSymbol: tokenA.symbol,
              tokenRate: `${pool.prices.tokenA.toFixed(4)} ${tokenB.symbol}`,
              tokenUSDValue: fCurrency(tokenUSDValue.toFixed(2)),
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
                tokenSymbol: tokenA.symbol,
                amount: BigNumber(pool.reserves.tokenA),
                fiatValue: BigNumber(pool.reserves.tokenA).multipliedBy(tokenA.price),
              },
              {
                tokenSymbol: tokenB.symbol,
                amount: BigNumber(pool.reserves.tokenB),
                fiatValue: BigNumber(pool.reserves.tokenB).multipliedBy(tokenB.price),
              },
            ]}
            stats={[
              { statName: 'TVL', value: tvl },
              { statName: '24h Volume', value: past24hVolume },
              {
                statName: '24h Fees',
                value: past24hVolume.multipliedBy(300 / 10000).dividedBy(2),
              },
            ]}
            tokens={tokens}
          />
        </Grid2>
      </Grid2>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 12 }}>
          <PoolTransactionsTable
            baseTokenSymbol={tokenA.symbol}
            quoteTokenSymbol={tokenB.symbol}
            rows={rows}
            quoteTokenPrice={tokenB.price}
          />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

function convertToPoolTxRow(event: events.PoolRouterEvent): PoolTxRow {
  switch (event.type) {
    case 'deposit':
      return {
        type: 'Deposit',
        tokenAAmount: BigNumber(event.amounts[0]),
        tokenBAmount: BigNumber(event.amounts[1]),
        user: event.user,
        timestamp: event.timestamp || 0,
        txHash: event.txHash,
      };

    case 'withdraw':
      return {
        type: 'Withdraw',
        tokenAAmount: BigNumber(event.amounts[0]),
        tokenBAmount: BigNumber(event.amounts[1]),
        user: event.user,
        timestamp: event.timestamp || 0,
        txHash: event.txHash,
      };

    case 'swap': {
      const buying = event.tokenIn === event.tokens[1];
      return {
        type: buying ? 'Buy' : 'Sell',
        tokenAAmount: BigNumber(buying ? event.outAmount : event.inAmount),
        tokenBAmount: BigNumber(buying ? event.inAmount : event.outAmount),
        user: event.user,
        timestamp: event.timestamp || 0,
        txHash: event.txHash,
      };
    }

    default:
      throw new Error(`Unsupported pool event type: ${event.type}`);
  }
}

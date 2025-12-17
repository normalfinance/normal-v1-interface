'use client';

import type { PoolTxRow } from '@/types/pools';
import type { Pool, events } from '@normalfinance/types';

import BigNumber from 'bignumber.js';
import { constants } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { usePoolEvents, usePoolPriceChart } from '@/hooks';
import { fPercent, fCurrency } from '@/utils/format-number';

import { Grid2, useTheme } from '@mui/material';

import { PoolOverview } from '@/components/_pool-page-components/pool-overview';
import { PoolChart } from '@/components/_pool-page-components/pool-chart/pool-chart';
import { PoolTransactionsTable } from '@/components/_pool-page-components/pool-transactions-table';

export default function AssetDetailsView({ symbol, pools }: { symbol: string; pools: Pool[] }) {
  const pool = pools[0];

  const theme = useTheme();
  const {
    tokenState: { tokens },
  } = usePersistStore();

  const tokenA = tokens.find((tkn) => tkn.contract === pool.addresses.tokenA)!;
  const tokenB = tokens.find((tkn) => tkn.contract === pool.addresses.tokenB)!;

  const displaySwap = tokenA.contract === constants.StellarConfig.USDC_ADDRESS;

  // Load recent pool events
  const { events } = usePoolEvents(pool.addresses.pool, 20);

  // Format the pool events
  const rows = events
    .map(convertToPoolTxRow)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  // Load price and volume chart data
  const { chartData } = usePoolPriceChart(pool.addresses.pool, []);

  const past24hVolume = BigNumber(0);

  const reserveAValue = tokenA
    ? BigNumber(pool.reserves.tokenA).multipliedBy(tokenA.price)
    : BigNumber(0);

  const reserveBValue = tokenB
    ? BigNumber(pool.reserves.tokenB).multipliedBy(tokenB.price)
    : BigNumber(0);

  const tvl = reserveAValue.plus(reserveBValue);

  return (
    <DashboardContent maxWidth="xl">
      <Grid2 container spacing={3}>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <PoolChart
            pairInfo={{
              tokenA,
              tokenB,
              address: pool.addresses.pool,
            }}
            metadata={{
              version: 'v1',
              feeTier: fPercent(pool.fee / 100),
            }}
            exchangeRate={{
              label: `1 ${!displaySwap ? tokenA.symbol : tokenB.symbol} = ${BigNumber(!displaySwap ? pool.prices.tokenA : pool.prices.tokenB).toFixed(!displaySwap ? tokenB.decimals : tokenA.decimals)} ${!displaySwap ? tokenB.symbol : tokenA.symbol}`,
              usdEquivalent: fCurrency(!displaySwap ? pool.prices.tokenA : pool.prices.tokenB),
              tokenSymbol: !displaySwap ? tokenA.symbol : tokenB.symbol,
              tokenRate: `${BigNumber(!displaySwap ? pool.prices.tokenA : pool.prices.tokenB).toFixed(!displaySwap ? tokenB.decimals : tokenA.decimals)} ${!displaySwap ? tokenB.symbol : tokenA.symbol}`,
              tokenUSDValue: fCurrency(!displaySwap ? pool.prices.tokenB : pool.prices.tokenA),
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
                address: tokenA.contract,
                tokenSymbol: tokenA.symbol,
                amount: BigNumber(pool.reserves.tokenA),
                fiatValue: BigNumber(pool.reserves.tokenA).multipliedBy(tokenA.price),
              },
              {
                address: tokenB.contract,
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
          />
        </Grid2>
      </Grid2>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 12 }}>
          <PoolTransactionsTable
            baseTokenSymbol={tokenA.symbol}
            quoteTokenSymbol={tokenB.symbol}
            rows={rows}
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

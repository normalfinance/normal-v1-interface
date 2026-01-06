'use client';

import type { PairTxRow } from '@/types/pools';
import type { events } from '@normalfinance/types';

import BigNumber from 'bignumber.js';
import { usePair, usePairEvents } from '@/hooks';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { fPercent, fCurrency } from '@/utils/format-number';

import { Grid2, useTheme } from '@mui/material';

import { PairTransactionsTable } from '@/components/_pool-page-components';
import { PoolOverview } from '@/components/_pool-page-components/pool-overview';
import { PoolChart } from '@/components/_pool-page-components/pool-chart/pool-chart';

export default function AssetDetailsView({
  symbol,
  pairAddress,
}: {
  symbol: string;
  pairAddress: string;
}) {
  const theme = useTheme();

  const {
    tokenState: { tokens },
  } = usePersistStore();

  const { loading, error, pair } = usePair(pairAddress);

  const { events } = usePairEvents(pairAddress, 20);

  if (!pair) {
    return <></>;
  }

  const isLong = symbol.includes('LONG');

  const token = tokens.find((tkn) =>
    isLong ? tkn.contract === pair.addresses.tokenLong : tkn.contract === pair.addresses.tokenShort
  )!;

  // Format the pair events
  const rows = events
    .map(convertToPairTxRow)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  const past24hVolume = BigNumber(0);

  const collateralValue = pair ? BigNumber(pair.collateral.amount).multipliedBy(1) : BigNumber(0);

  return (
    <DashboardContent maxWidth="xl">
      <Grid2 container spacing={3}>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <PoolChart
            pairInfo={{
              token,
              address: pairAddress,
            }}
            metadata={{
              version: 'v1',
              feeTier: fPercent(30),
            }}
            exchangeRate={{
              label: `1 ${token.symbol} = ${BigNumber(token.price).toFixed(token.decimals)} USD`,
              usdEquivalent: fCurrency(token.price),
              tokenSymbol: token.symbol,
              tokenRate: `${BigNumber(token.price).toFixed(token.decimals)} ${token.symbol}`,
              tokenUSDValue: fCurrency(token.price),
            }}
            performance={{ percentageChange: 0 }}
            // chart={chartData}
            color={theme.palette.primary.main}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <PoolOverview
            totalAprPercentage={0}
            poolBalances={[
              {
                address: pairAddress,
                tokenSymbol: symbol,
                amount: BigNumber(0),
                fiatValue: BigNumber(1).multipliedBy(token.price),
              },
            ]}
            stats={[
              { statName: 'TVL', value: collateralValue },
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
          <PairTransactionsTable assetSymbol={symbol} rows={rows} />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

function convertToPairTxRow(event: events.NormalContractEvent): PairTxRow {
  switch (event.type) {
    case 'deposit':
      return {
        type: 'Deposit',
        user: event.user,
        amount: BigNumber(event.amount),
        timestamp: Number(event.ts),
        txHash: event.txHash,
      };

    case 'withdraw':
      return {
        type: 'Withdraw',
        user: event.user,
        amount: BigNumber(event.amount),
        timestamp: Number(event.ts),
        txHash: event.txHash,
      };

    case 'mint':
      return {
        type: 'Mint',
        amount: BigNumber(event.tokensMinted),
        user: event.user,
        timestamp: Number(event.ts),
        txHash: event.txHash,
      };

    case 'redeem':
      return {
        type: 'Redeem',
        amount: BigNumber(event.tokensRedeemed),
        user: event.user,
        timestamp: Number(event.ts),
        txHash: event.txHash,
      };

    case 'trade': {
      const buying = event.direction === BigInt(1);
      return {
        type: 'Trade',
        amount: BigNumber(event.amount),
        user: event.user,
        timestamp: Number(event.ts),
        txHash: event.txHash,
      };
    }

    // default:
    //   throw new Error(`Unsupported pair event type: ${event.type}`);
  }
}

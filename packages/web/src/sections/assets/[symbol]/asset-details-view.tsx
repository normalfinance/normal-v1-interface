'use client';

import type { PairTxRow } from '@/types/pools';
import type { events } from '@normalfinance/types';

import BigNumber from 'bignumber.js';
import { usePair, usePairEvents } from '@/hooks';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { useTreasuryBalances } from '@/hooks/stellar/use-treasury-balances';

import { Grid2, useTheme } from '@mui/material';

import { useSnackbar } from '@/components/template/snackbar';
import { PairTransactionsTable } from '@/components/_pool-page-components';
import { SpecificNotFound } from '@/components/_common/specific-not-found';
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
  const { enqueueSnackbar } = useSnackbar();

  const {
    tokenState: { tokens },
  } = usePersistStore();

  const { loading, error, pair, fetchPair: refreshPair } = usePair(pairAddress);

  const { balances: treasuryBalances } = useTreasuryBalances(pairAddress);

  const { events } = usePairEvents(pairAddress, 20);

  if (!pair) {
    return <SpecificNotFound type="pair" />;
  }

  // Format the pair events
  const rows = events
    .map(convertToPairTxRow)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  const past24hVolume = BigNumber(0);

  // Find tokens
  const collateralToken = tokens.find((tkn) => tkn.contract === pair.tokens.collateral);
  const longToken = tokens.find((tkn) => tkn.contract === pair.tokens.long);
  const shortToken = tokens.find((tkn) => tkn.contract === pair.tokens.short);

  const collateralValue =
    pair && collateralToken
      ? BigNumber(pair.collateral.totalCollateral).multipliedBy(collateralToken.price)
      : BigNumber(0);

  const onRefresh = async () => {
    enqueueSnackbar('Refreshing asset', { variant: 'info' });
    await refreshPair();
  };

  return (
    <DashboardContent maxWidth="xl">
      <Grid2 container spacing={3}>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <PoolChart
            pair={pair}
            tokens={{
              long: longToken!,
              short: shortToken!,
              collateral: collateralToken!,
            }}
            performance={{ percentageChange: 0 }}
            // chart={chartData}
            color={theme.palette.primary.main}
            onRefresh={onRefresh}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <PoolOverview
            asset={symbol}
            totalAprPercentage={0}
            treasuryBalances={[
              {
                address: pair.tokens.long,
                type: 'LONG',
                amount: treasuryBalances?.long ?? BigNumber(0),
                fiatValue:
                  longToken && treasuryBalances
                    ? treasuryBalances.long.multipliedBy(longToken.price)
                    : BigNumber(0),
              },
              {
                address: pair.tokens.short,
                type: 'SHORT',
                amount: treasuryBalances?.short ?? BigNumber(0),
                fiatValue:
                  shortToken && treasuryBalances
                    ? treasuryBalances.short.multipliedBy(shortToken.price)
                    : BigNumber(0),
              },
              {
                address: pair.tokens.collateral,
                type: 'USDC',
                amount: treasuryBalances?.usdc ?? BigNumber(0),
                fiatValue:
                  collateralToken && treasuryBalances
                    ? treasuryBalances.usdc.multipliedBy(collateralToken.price)
                    : BigNumber(0),
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
        usdcAmount: BigNumber(event.usdcAmount),
        assetAmount: BigNumber(event.pairAmount),
        timestamp: Number(event.ts),
        txHash: event.txHash,
      };

    case 'withdraw':
      return {
        type: 'Withdraw',
        user: event.user,
        usdcAmount: BigNumber(event.usdcAmount),
        assetAmount: BigNumber(event.pairAmount),
        timestamp: Number(event.ts),
        txHash: event.txHash,
      };

    case 'mint':
      return {
        type: 'Mint',
        usdcAmount: BigNumber(event.collateral),
        assetAmount: BigNumber(event.tokensMinted),
        user: event.user,
        timestamp: Number(event.ts),
        txHash: event.txHash,
      };

    case 'redeem':
      return {
        type: 'Redeem',
        usdcAmount: BigNumber(event.collateral),
        assetAmount: BigNumber(event.tokensRedeemed),
        user: event.user,
        timestamp: Number(event.ts),
        txHash: event.txHash,
      };

    case 'trade': {
      return {
        type: event.direction === 'Buy' ? 'Buy' : 'Sell',
        usdcAmount: BigNumber(event.direction === 'Buy' ? event.inAmount : event.outAmount),
        assetAmount: BigNumber(event.direction === 'Buy' ? event.outAmount : event.inAmount),
        user: event.user,
        timestamp: Number(event.ts),
        txHash: event.txHash,
      };
    }

    default:
      throw new Error('Unsupported pair event type');
  }
}

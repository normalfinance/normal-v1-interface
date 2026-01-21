'use client';

import type { Pair, TokenMapType } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { useMemo, useEffect } from 'react';
import { fCurrency } from '@/utils/format-number';
import { DashboardContent } from '@/layouts/dashboard';
import { logger, constants } from '@normalfinance/utils';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useAgo, useTreasury, useTotal1dTradeVolume } from '@/hooks';
import { useTreasuryLiquidityByPair } from '@/hooks/stellar/useTreasuryLiquidityByPair';

import Grid2 from '@mui/material/Grid2';
import { Box, Stack, Typography } from '@mui/material';

import ExploreStats from '@/components/_explore-page-components/explore-stats/explore-stats';
import {
  type SingleStat,
  ExploreAssetsTable,
  type ExploreAssetsRow,
} from '@/components/_explore-page-components';

export default function AssetsView() {
  const { t } = useTranslate();

  const { globalIsLoading, setGlobalIsLoading } = useAppStore();
  const {
    wallet,
    tokenState: { tokensByAddress, lastUpdated: tokensLastUpdated },
    getAllTokens,
    pairState: { pairs, lastUpdated: pairsLastUpdated },
    getAllPairs,
  } = usePersistStore();

  const { total1dVolume, volumeByPair } = useTotal1dTradeVolume();

  const { fetchBalances } = useTreasury();

  const { liquidityValueByPair, balancesByPair, totalLiquidityValue, loading } =
    useTreasuryLiquidityByPair({
      pairs,
      tokensByAddress,
      fetchTreasuryBalancesForPair: fetchBalances,
    });

  const lastUpdated = useAgo(Math.min(tokensLastUpdated, pairsLastUpdated));

  const tableData = useMemo(() => {
    if (
      !pairs ||
      pairs.length === 0 ||
      !tokensByAddress ||
      Object.keys(tokensByAddress).length === 0
    ) {
      return [];
    }
    return pairs.map((pair) =>
      formatPairForTable(pair, tokensByAddress, volumeByPair, liquidityValueByPair)
    );
  }, [pairs, tokensByAddress, volumeByPair]);

  const totalTvl = tableData.reduce((acc, p) => acc.plus(p.collateral), BigNumber(0));

  const stats: SingleStat[] = [
    {
      title: '1D Volume',
      total: Number(total1dVolume.toFixed(2)),
      percent: 0,
      formatter: fCurrency,
    },
    { title: 'Total TVL', total: Number(totalTvl.toFixed(2)), percent: 0, formatter: fCurrency },
    {
      title: 'Total Liquidity',
      total: Number(totalLiquidityValue.toFixed(2)),
      percent: 0,
      formatter: fCurrency,
    },
  ];

  // Effect hook to fetch all pools and tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllPairs();
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address]);

  useEffect(() => {
    const fetchAllBalances = async (): Promise<void> => {
      pairs.forEach(async (pair) => {
        const balances = await fetchBalances(pair.pairAddress);
      });
    };
    fetchAllBalances();
  }, [pairs]);

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <Stack spacing={1}>
          <Typography variant="h4" color="text.primary">
            {t('Explore')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('as of ')}
            {lastUpdated}
          </Typography>
        </Stack>
        <Grid2 width={1} sx={{ mt: 3 }}>
          <ExploreStats stats={stats} />
        </Grid2>
        <Grid2>
          <ExploreAssetsTable assets={tableData} loading={globalIsLoading} />
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

const formatPairForTable = (
  pair: Pair,
  tokens: TokenMapType,
  volumeByPair: Record<string, BigNumber>,
  liquidityValueByPair: Record<string, BigNumber>
): ExploreAssetsRow => {
  const tokenLong = tokens[pair.tokens.long] ?? undefined;

  // Scaled Price
  const priceBoundaryDelta = BigNumber(pair.priceBounds.upper).minus(pair.priceBounds.lower);
  const scaledPrice = BigNumber(pair.collateral.collateralPercentLong)
    .multipliedBy(priceBoundaryDelta)
    .plus(pair.priceBounds.lower);

  return {
    asset: pair.asset,
    address: pair.pairAddress,
    status: pair.status.tag,
    price: pair.collateral.collateralPercentLong,
    scaledPrice: scaledPrice.toFixed(2),
    collateral: pair.collateral.totalCollateral.toString(),
    liquidity:
      pair.pairAddress in liquidityValueByPair
        ? liquidityValueByPair[pair.pairAddress].toFixed(2)
        : '0',
    volume1d: pair.pairAddress in volumeByPair ? volumeByPair[pair.pairAddress].toFixed(2) : '0',
    tokenLong,
  };
};

'use client';

import type { Pair, TokenMapType } from '@normalfinance/types';

import { useAgo } from '@/hooks';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { useMemo, useEffect } from 'react';
import { logger } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { fCurrency, fShortenNumber } from '@/utils/format-number';
import { useAppStore, usePersistStore } from '@normalfinance/state';

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
    pairState: { pairs, lastUpdated: poolsLastUpdated },
    getAllPairs,
  } = usePersistStore();

  const lastUpdated = useAgo(Math.min(tokensLastUpdated, poolsLastUpdated));

  const tableData = useMemo(() => {
    if (
      !pairs ||
      pairs.length === 0 ||
      !tokensByAddress ||
      Object.keys(tokensByAddress).length === 0
    ) {
      return [];
    }
    return pairs.map((pair) => formatPairForTable(pair, tokensByAddress));
  }, [pairs, tokensByAddress]);

  const totalTvl = tableData.reduce((acc, p) => acc.plus(p.totalCollateral), BigNumber(0));

  // const { total1dVolume } = useTotal1dSwapVolume();
  const total1dVolume = 0;

  const stats: SingleStat[] = [
    { title: '1D Volume', total: total1dVolume, percent: 0, formatter: fCurrency },
    { title: 'Total TVL', total: Number(totalTvl.toFixed(2)), percent: 0, formatter: fCurrency },
    {
      title: 'Total Assets',
      total: pairs.length * 2,
      percent: 0,
      formatter: fShortenNumber,
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

const formatPairForTable = (pair: Pair, tokens: TokenMapType): ExploreAssetsRow => {
  const tokenLong = tokens[pair.tokens.long] ?? undefined;
  const tokenShort = tokens[pair.tokens.short] ?? undefined;

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
    totalCollateral: pair.collateral.totalCollateral.toString(),
    volume1d: '0',
    lowerPriceBound: pair.priceBounds.lower,
    upperPriceBound: pair.priceBounds.upper,
    tokenLong,
    tokenShort,
  };
};

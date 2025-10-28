'use client';

import type { PoolInfo, TokenMapType } from '@normalfinance/types';

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
  ExplorePoolsTable,
  type ExplorePoolsRow,
} from '@/components/_explore-page-components';

export default function ExploreView() {
  const { t } = useTranslate();

  const { globalIsLoading, setGlobalIsLoading } = useAppStore();
  const {
    tokenState: { tokensByAddress },
    getAllTokens,
    poolState: { pools },
    getAllPools,
  } = usePersistStore();

  const tableData = useMemo(() => {
    if (
      !pools ||
      pools.length === 0 ||
      !tokensByAddress ||
      Object.keys(tokensByAddress).length === 0
    )
      return [];
    return pools.map((pool) => formatPoolForTable(pool, tokensByAddress));
  }, [pools, tokensByAddress]);

  console.log({ tableData });

  const totalTvl = tableData.reduce((acc, p) => acc.plus(p.tvl), new BigNumber(0));

  const stats: SingleStat[] = [
    { title: '1D Volume', total: 0, percent: 0, formatter: fCurrency },
    { title: 'Total TVL', total: Number(totalTvl.toFixed(2)), percent: 0, formatter: fCurrency },
    {
      title: 'Total Pools',
      total: pools.length,
      percent: 0,
      formatter: fShortenNumber,
    },
  ];

  // Effect hook to fetch all tokens and pools once the component mounts
  useEffect(() => {
    const refreshData = async (): Promise<void> => {
      setGlobalIsLoading(true);
      try {
        await Promise.all([await getAllTokens(), await getAllPools()]);
        setGlobalIsLoading(false);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshData();
  }, []);

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <Stack spacing={1}>
          <Typography variant="h4" color="text.primary">
            {t('Explore')}
          </Typography>
        </Stack>
        <Grid2 width={1} sx={{ mt: 3 }}>
          <ExploreStats stats={stats} />
        </Grid2>
        <Grid2 sx={{ mt: 3 }}>
          <ExplorePoolsTable pools={tableData} loading={globalIsLoading} />
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

const formatPoolForTable = (pool: PoolInfo, tokens: TokenMapType): ExplorePoolsRow => {
  const tokenA = tokens[pool.tokenA] ?? undefined;
  const tokenB = tokens[pool.tokenB] ?? undefined;
  console.log({ tokenA, tokenB });

  if (pool.reserves.tokenA === 0 || pool.reserves.tokenB === 0) {
    return {
      tokenAName: tokenA ? tokenA.symbol : '',
      tokenBName: tokenB ? tokenB.symbol : '',
      address: pool.address,
      fee: pool.feeFraction,
      tvl: Number(0),
      apr: 0,
      volume1d: 0,
      volume30d: 0,
      ratio: 0,
    };
  }

  // Volume
  const volume1d = BigNumber(0);
  const volume30d = BigNumber(0);

  const volume1dValue = volume1d.multipliedBy(1); // FIXME: finish
  const volume30dValue = volume30d.multipliedBy(1); // FIXME: finish

  const tvl = BigNumber(pool.reserves.tokenA)
    .multipliedBy(pool.prices.tokenA)
    .plus(BigNumber(pool.reserves.tokenB).multipliedBy(pool.prices.tokenB));
  const ratio = volume1d.dividedBy(tvl);

  return {
    tokenAName: tokenA ? tokenA.symbol : '',
    tokenBName: tokenB ? tokenB.symbol : '',
    address: pool.address,
    fee: pool.feeFraction,
    tvl: Number(tvl.toFixed(2)),
    apr: 0,
    volume1d: Number(volume1dValue.toFixed(2)),
    volume30d: Number(volume30dValue.toFixed(2)),
    ratio: Number(ratio.toFixed(4)),
  };
};

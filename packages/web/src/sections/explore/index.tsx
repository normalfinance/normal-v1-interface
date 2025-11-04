'use client';

import type { Pool, TokenMapType } from '@normalfinance/types';

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
    wallet,
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
    ) {
      return [];
    }
    return pools.map((pool) => formatPoolForTable(pool, tokensByAddress));
  }, [pools, tokensByAddress]);

  const totalTvl = tableData.reduce((acc, p) => acc.plus(p.tvl), BigNumber(0));

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
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address]);

  // Effect hook to fetch all pools once the component mounts
  useEffect(() => {
    const refreshPools = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllPools();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshPools();
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

const formatPoolForTable = (pool: Pool, tokens: TokenMapType): ExplorePoolsRow => {
  const tokenA = tokens[pool.addresses.tokenA] ?? undefined;
  const tokenB = tokens[pool.addresses.tokenB] ?? undefined;

  if (BigNumber(pool.reserves.tokenA).eq(0) || BigNumber(pool.reserves.tokenB).eq(0)) {
    return {
      tokenAName: tokenA ? tokenA.symbol : '',
      tokenBName: tokenB ? tokenB.symbol : '',
      address: pool.addresses.pool,
      fee: pool.fee,
      tvl: '0',
      apr: 0,
      volume1d: '0',
      volume30d: '0',
      ratio: '0',
      tokenA,
      tokenB,
    };
  }

  // Volume
  const volume1d = BigNumber(0);
  const volume30d = BigNumber(0);

  const volume1dValue = volume1d.multipliedBy(1); // FIXME: finish
  const volume30dValue = volume30d.multipliedBy(1); // FIXME: finish

  const reserveAValue = tokenA
    ? BigNumber(pool.reserves.tokenA).multipliedBy(tokenA.price)
    : BigNumber(0);

  const reserveBValue = tokenB
    ? BigNumber(pool.reserves.tokenB).multipliedBy(tokenB.price)
    : BigNumber(0);

  const tvl = reserveAValue.plus(reserveBValue);

  const ratio = '0'; // volume1d.dividedBy(tvl);

  return {
    tokenAName: tokenA ? tokenA.symbol : '',
    tokenBName: tokenB ? tokenB.symbol : '',
    address: pool.addresses.pool,
    fee: pool.fee,
    tvl: tvl.toString(),
    apr: 0,
    volume1d: volume1dValue.toString(),
    volume30d: volume30dValue.toString(),
    ratio,
    tokenA,
    tokenB,
  };
};

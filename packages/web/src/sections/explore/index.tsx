'use client';

import type { PoolInfo } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { useAppStore } from '@normalfinance/state';
import { useMemo, useEffect } from 'react';
import { format, logger } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { fCurrency, fShortenNumber } from '@/utils/format-number';

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

  const { globalIsLoading, setGlobalIsLoading, getAllTokens, pools } = useAppStore();

  const formattedPools = useMemo(() => {
    return pools.map((pool) => {
      return formatPool(pool);
    });
  }, [pools]);

  const totalTvl = formattedPools.reduce((acc, p) => acc.plus(p.tvl), new BigNumber(0));

  const stats: SingleStat[] = [
    { title: '1D Volume', total: Number(0), percent: 0, formatter: fCurrency },
    { title: 'Total TVL', total: Number(totalTvl.toFixed(2)), percent: 0, formatter: fCurrency },
    {
      title: 'Total Pools',
      total: pools ? pools.length : 0,
      percent: 0,
      formatter: fShortenNumber,
    },
  ];

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      setGlobalIsLoading(true);
      try {
        await getAllTokens();
        setGlobalIsLoading(false);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
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
          <ExplorePoolsTable pools={formattedPools} loading={globalIsLoading} />
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

const formatPool = (pool: PoolInfo): ExplorePoolsRow => {
  const quoteTokenOraclePrice = pool.token_b.oraclePrice;
  const reserveA = BigNumber(format.formatTokenAmount(pool.token_a.amount));
  const reserveB = BigNumber(format.formatTokenAmount(pool.token_b.amount));

  if (reserveA.eq(0) || reserveB.eq(0)) {
    return {
      tokenAName: pool.token_a.symbol,
      tokenBName: pool.token_b.symbol,
      address: pool.address,
      fee: pool.fee_fraction,
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

  const volume1dValue = volume1d.multipliedBy(quoteTokenOraclePrice);
  const volume30dValue = volume30d.multipliedBy(quoteTokenOraclePrice);

  const pool_price = reserveB.div(reserveA);

  const reserveBValue = reserveB.multipliedBy(quoteTokenOraclePrice);
  const reserveAValue = pool_price.multipliedBy(reserveA).multipliedBy(quoteTokenOraclePrice);

  const tvl = reserveAValue.plus(reserveBValue);
  const ratio = volume1d.dividedBy(tvl);

  return {
    tokenAName: pool.token_a.symbol,
    tokenBName: pool.token_b.symbol,
    address: pool.address,
    fee: pool.fee_fraction,
    tvl: Number(tvl.toFixed(2)),
    apr: 0,
    volume1d: Number(volume1dValue.toFixed(2)),
    volume30d: Number(volume30dValue.toFixed(2)),
    ratio: Number(ratio.toFixed(4)),
  };
};

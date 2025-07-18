'use client';

import type { PoolRouterContract } from '@normalfinance/contracts';

import { useTranslate } from '@/locales';
import { useMemo, useEffect } from 'react';
import { usePools, useTotalTVL } from '@/hooks';
import { useAppStore } from '@normalfinance/state';
import { DashboardContent } from '@/layouts/dashboard';
import { fCurrency, fShortenNumber } from '@/utils/format-number';

import Grid2 from '@mui/material/Grid2';
import { Stack, Typography } from '@mui/material';

import ExploreStats from '@/components/_explore-page-components/explore-stats/explore-stats';
import {
  type SingleStat,
  ExplorePoolsTable,
  type ExplorePoolsRow,
} from '@/components/_explore-page-components';

export default function ExploreView() {
  const { t } = useTranslate();

  const store = useAppStore();

  const { pools, loading: poolsLoading } = usePools();
  const { totalTVL } = useTotalTVL();
  // const { totalVolume1d, getVolumeSince } = useVolumes();
  const totalVolume1d = 0;

  const stats: SingleStat[] = [
    { title: '1D Volume', total: totalVolume1d || 0, percent: 0, formatter: fCurrency },
    { title: 'Total TVL', total: totalTVL || 0, percent: 0, formatter: fCurrency },
    {
      title: 'Total Pools',
      total: pools ? pools.length : 0,
      percent: 0,
      formatter: fShortenNumber,
    },
  ];

  const formattedPools = useMemo(() => pools.map((p) => formatPool(p)), [pools]);

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const getAllTokens = async (): Promise<void> => {
      store.setLoading(true);
      try {
        const allTokens = await store.getAllTokens();
        // console.log(allTokens)
        store.setLoading(false);
      } catch (e) {
        console.error(e);
      } finally {
        store.setLoading(false);
      }
    };
    getAllTokens();
  }, []);

  return (
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
        <ExplorePoolsTable pools={formattedPools} loading={poolsLoading} />
      </Grid2>
    </DashboardContent>
  );
}

const formatPool = (pool_info: PoolRouterContract.PoolInfo): ExplorePoolsRow => {
  const {
    pool_address: address,
    pool_response: { pool },
  } = pool_info;

  return {
    tokenAName: pool.base_asset,
    tokenBName: pool.quote_asset,
    address,
    fee: pool.fee_fraction,
    tvl: 0,
    apr: 0,
    volume1d: 0,
    volume30d: 0,
    ratio: 0,
  };
};

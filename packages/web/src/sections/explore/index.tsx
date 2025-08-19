'use client';

import type { PoolRouterContract } from '@normalfinance/contracts';

import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { format } from '@normalfinance/utils';
import { useAppStore } from '@normalfinance/state';
import { useMemo, useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { useSwapVolume, useTokenPrice } from '@/hooks';
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

  // const { totalTVL } = useTotalTVL();
  const { getSwapVolume } = useSwapVolume();

  // Load XLM price
  const { loading: priceLoading, price: xlmPrice } = useTokenPrice('XLM');

  const [volume, setVolume] = useState<number | undefined>(undefined);

  useEffect(() => {
    getSwapVolume({ timeframe: '24h' }).then((res) => setVolume(res['24h'].volume));
  }, []);

  const formattedPools = useMemo(
    () => pools.map((p) => formatPool(p, xlmPrice ?? 0)),
    [pools, xlmPrice]
  );

  const totalTvl = formattedPools.reduce((acc, p) => acc.plus(p.tvl), new BigNumber(0));

  const stats: SingleStat[] = [
    { title: '1D Volume', total: volume ?? 0, percent: 0, formatter: fCurrency },
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
        console.error(e);
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

const formatPool = (pool_info: PoolRouterContract.PoolInfo, xlmPrice: number): ExplorePoolsRow => {
  const {
    pool_address: address,
    pool_response: { pool, token_a, token_b },
  } = pool_info;

  const reserve_a = BigNumber(format.formatTokenAmount(token_a.amount));
  const reserve_b = BigNumber(format.formatTokenAmount(token_b.amount));

  const pool_price = reserve_b.div(reserve_a);

  const xlm_price = BigNumber(format.formatTokenAmount(xlmPrice, 14));

  const reserve_b_value = reserve_b.multipliedBy(xlm_price);
  const reserve_a_value = pool_price.multipliedBy(reserve_a).multipliedBy(xlm_price);

  return {
    tokenAName: `n${pool.base_asset}`,
    tokenBName: pool.quote_asset,
    address,
    fee: pool.fee_fraction,
    tvl: Number(reserve_a_value.plus(reserve_b_value).toFixed(2)),
    apr: 0,
    volume1d: 0,
    volume30d: 0,
    ratio: 0,
  };
};

'use client';

import type { events } from '@normalfinance/types';
import type { PoolRouterContract } from '@normalfinance/contracts';

import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { format, logger } from '@normalfinance/utils';
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

  const { loading: loadingSwaps, error: swapsError, allSwaps, getSwapVolume } = useSwapVolume();

  // Load XLM price
  const { loading: priceLoading, price: xlmPrice } = useTokenPrice('XLM');

  const [volume, setVolume] = useState<BigNumber>(BigNumber(0));

  useEffect(() => {
    getSwapVolume().then((res) => setVolume(res['24h'].volume));
  }, []);

  const formattedPools = useMemo(() => {
    // TODO:
    const dTime = 0;
    const mTime = 0;

    return pools.map((p) => {
      const poolSwaps = allSwaps.filter((s) => s.asset === p.pool_response.pool.base_asset);
      return formatPool(p, xlmPrice, poolSwaps, dTime, mTime);
    });
  }, [pools, xlmPrice]);

  const totalTvl = formattedPools.reduce((acc, p) => acc.plus(p.tvl), new BigNumber(0));

  const dailyVolume = useMemo(
    () => format.formatTokenAmount(volume.multipliedBy(xlmPrice)),
    [pools, xlmPrice]
  );

  const stats: SingleStat[] = [
    { title: '1D Volume', total: Number(dailyVolume), percent: 0, formatter: fCurrency },
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

const formatPool = (
  pool_info: PoolRouterContract.PoolInfo,
  xlmPrice: BigNumber,
  swaps: events.RouterSwapEvent[],
  dailyCutoff: number,
  monthlyCutoff: number
): ExplorePoolsRow => {
  const {
    pool_address: address,
    pool_response: { pool, token_a, token_b },
  } = pool_info;

  const normalTokenName = format.formatNormalToken(pool.base_asset, 'with-n');

  const reserveA = BigNumber(format.formatTokenAmount(token_a.amount));
  const reserveB = BigNumber(format.formatTokenAmount(token_b.amount));

  if (reserveA.eq(0) || reserveB.eq(0)) {
    return {
      tokenAName: normalTokenName,
      tokenBName: pool.quote_asset,
      address,
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

  // swaps.forEach((s) => {
  //   const swapTime = new Date(s.ledger_closed_at);

  //   if (swapTime < dailyCutoff) {
  //     volume1d = volume1d.plus(0);
  //   } else if (swapTime < monthlyCutoff) {
  //     volume30d = volume30d.plus(0);
  //   }
  // });

  const volume1dValue = volume1d.multipliedBy(xlmPrice);
  const volume30dValue = volume30d.multipliedBy(xlmPrice);

  const pool_price = reserveB.div(reserveA);

  const reserveBValue = reserveB.multipliedBy(xlmPrice);
  const reserveAValue = pool_price.multipliedBy(reserveA).multipliedBy(xlmPrice);

  const tvl = reserveAValue.plus(reserveBValue);
  const ratio = volume1d.dividedBy(tvl);

  return {
    tokenAName: normalTokenName,
    tokenBName: pool.quote_asset,
    address,
    fee: pool.fee_fraction,
    tvl: Number(tvl.toFixed(2)),
    apr: 0,
    volume1d: Number(volume1dValue.toFixed(2)),
    volume30d: Number(volume30dValue.toFixed(2)),
    ratio: Number(ratio.toFixed(4)),
  };
};

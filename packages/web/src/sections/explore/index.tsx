'use client';

import { useMemo, useEffect } from 'react';
import { Box, Stack, Typography, Button } from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { BigNumber } from 'bignumber.js';

import { DashboardContent } from '@/layouts/dashboard';
import { useTranslate } from '@/locales';
import { useAppStore } from '@normalfinance/state';
import { useTokenPrice } from '@/hooks';
import { format } from '@normalfinance/utils';

import ExploreStats from '@/components/_explore-page-components/explore-stats/explore-stats';
import { ExplorePoolsTable, type ExplorePoolsRow } from '@/components/_explore-page-components';

import { Spinner } from '@/components/_async/spinner';
import { AsyncGuard } from '@/components/_async/async-guard';
import type { AsyncState } from '@/types/async';
import { useExploreStatsState } from '@/hooks/use-explore-stats-state';
import { combineAsync } from '@/types/combine-async';
import type { PoolRouterContract } from '@normalfinance/contracts';
import { LogoLoader } from '@/components/_async/logo-loader';

export default function ExploreView() {
  const { t } = useTranslate();
  const { globalIsLoading, setGlobalIsLoading, getAllTokens, pools } = useAppStore();
  const { price: xlmPrice } = useTokenPrice('XLM');

  const formattedPools = useMemo(
    () => pools.map((p) => formatPool(p, xlmPrice ?? 0)),
    [pools, xlmPrice]
  );

  useEffect(() => {
    const refreshTokens = async () => {
      setGlobalIsLoading(true);
      try {
        await getAllTokens();
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [getAllTokens, setGlobalIsLoading]);

  const poolsState: AsyncState<ExplorePoolsRow[]> = useMemo(
    () => ({
      data: formattedPools,
      isLoading: globalIsLoading,
      error: null,
      isEmpty: !globalIsLoading && formattedPools.length === 0,
      refetch: () => {
        void getAllTokens();
      },
    }),
    [formattedPools, globalIsLoading, getAllTokens]
  );

  const statsState = useExploreStatsState();

  const pageState = combineAsync(statsState, poolsState);

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <AsyncGuard
        state={pageState}
        loading={<LogoLoader fullScreen size={420} />}
        error={(err, refetch) => (
          <Box
            role="alert"
            sx={{
              position: 'fixed',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              p: 2,
              zIndex: (t) => t.zIndex.modal + 2,
              bgcolor: 'background.default',
            }}
          >
            <div>
              <Typography variant="h6" gutterBottom>
                Failed to load Explore data
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {String((err as any)?.message ?? err ?? 'Unknown error')}
              </Typography>
              {refetch && (
                <Button variant="contained" onClick={refetch}>
                  Retry
                </Button>
              )}
            </div>
          </Box>
        )}
        empty={
          <Box
            sx={{
              position: 'fixed',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              zIndex: (t) => t.zIndex.modal + 2,
              bgcolor: 'background.default',
            }}
          >
            <Typography>No data available yet.</Typography>
          </Box>
        }
      >
        {([stats, rows]) => (
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
              <ExplorePoolsTable pools={rows} loading={false} />
            </Grid2>
          </DashboardContent>
        )}
      </AsyncGuard>
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

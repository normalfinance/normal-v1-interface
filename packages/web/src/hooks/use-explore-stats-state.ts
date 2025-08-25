'use client';

import type { AsyncState } from '@/types/async';
import type { PoolRouterContract } from '@normalfinance/contracts';
import type { SingleStat } from '@/components/_explore-page-components/explore-stats/explore-stats';

import { BigNumber } from 'bignumber.js';
import { format } from '@normalfinance/utils';
import { useAppStore } from '@normalfinance/state';
import { useSwapVolume, useTokenPrice } from '@/hooks';
import { fCurrency, fShortenNumber } from '@/utils/format-number';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

export function useExploreStatsState(): AsyncState<SingleStat[]> {
  const { pools, getAllTokens } = useAppStore();
  const { getSwapVolume } = useSwapVolume();
  const {
    loading: priceLoading,
    price: xlmPrice,
    error: priceError,
    refetch: refetchPrice,
  } = useTokenPrice('XLM') as {
    loading: boolean;
    price?: number;
    error?: unknown | null;
    refetch?: () => void;
  };

  const [volLoading, setVolLoading] = useState(true);
  const [volError, setVolError] = useState<unknown | null>(null);
  const [volume24h, setVolume24h] = useState<number>(0);

  const [poolsLoading, setPoolsLoading] = useState(false);
  const poolsLoadedOnce = useRef(false);

  // Ensure pools exist once
  useEffect(() => {
    if (!poolsLoadedOnce.current && (!pools || pools.length === 0)) {
      (async () => {
        try {
          setPoolsLoading(true);
          await getAllTokens();
        } catch (e) {
          // surface via error aggregation below
        } finally {
          setPoolsLoading(false);
          poolsLoadedOnce.current = true;
        }
      })();
    }
  }, [pools, getAllTokens]);

  // Load 24h volume
  const loadVolume = useCallback(async () => {
    setVolLoading(true);
    setVolError(null);
    try {
      const res = await getSwapVolume({ timeframe: '24h' });
      setVolume24h(res['24h']?.volume ?? 0);
    } catch (e) {
      setVolError(e);
    } finally {
      setVolLoading(false);
    }
  }, [getSwapVolume]);

  useEffect(() => {
    loadVolume();
  }, [loadVolume]);

  const isLoading = priceLoading || volLoading || poolsLoading;
  const error = priceError || volError || null;

  const stats = useMemo<SingleStat[] | undefined>(() => {
    if (!pools || !xlmPrice) return undefined;

    const totalTvl = pools
      .map((p) => poolToTvlUSD(p, xlmPrice))
      .reduce((acc, n) => acc.plus(n), new BigNumber(0));

    return [
      { title: '1D Volume', total: volume24h ?? 0, percent: 0, formatter: fCurrency },
      { title: 'Total TVL', total: Number(totalTvl.toFixed(2)), percent: 0, formatter: fCurrency },
      { title: 'Total Pools', total: pools.length ?? 0, percent: 0, formatter: fShortenNumber },
    ];
  }, [pools, xlmPrice, volume24h]);

  const isEmpty = !isLoading && !error && !!stats && stats.length === 0;

  const refetch = () => {
    loadVolume();
    refetchPrice?.();
    // pools refresh is optional; enable if you want a “hard” refresh:
    // getAllTokens().catch(() => {});
  };

  return {
    isLoading,
    error,
    isEmpty,
    data: stats,
    refetch,
  };
}

/* ---------- helpers ---------- */

function poolToTvlUSD(pool_info: PoolRouterContract.PoolInfo, xlmPrice: number): BigNumber {
  const {
    pool_response: { pool, token_a, token_b },
  } = pool_info;

  const reserveA = BigNumber(format.formatTokenAmount(token_a.amount));
  const reserveB = BigNumber(format.formatTokenAmount(token_b.amount));
  const poolPrice = reserveB.div(reserveA); // B per A

  const xlm = BigNumber(format.formatTokenAmount(xlmPrice, 14));
  const reserveBVal = reserveB.multipliedBy(xlm);
  const reserveAVal = poolPrice.multipliedBy(reserveA).multipliedBy(xlm);

  return reserveAVal.plus(reserveBVal);
}

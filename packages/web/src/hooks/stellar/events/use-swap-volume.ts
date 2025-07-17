'use client';

import type { TimeEpoch } from '@normalfinance/types';

import * as Sentry from '@sentry/nextjs';
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/createSupabaseClient';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  getSwapVolume: (params?: GetSwapVolumeParams) => Promise<SwapVolumeStats>;
}

type SwapVolumeStats = Record<
  TimeEpoch,
  {
    volume: number;
    trades: number;
  }
>;

type GetSwapVolumeParams =
  | undefined
  | {
      timeframe?: TimeEpoch;
      since?: Date;
      poolAddress?: string;
    };

const timeframesInMs: Record<TimeEpoch, number> = {
  '1d': 1 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '12m': 365 * 24 * 60 * 60 * 1000,
};

// ----------------------------------------------------------------------

export function useSwapVolume(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const getSwapVolume = useCallback(
    async (params?: GetSwapVolumeParams): Promise<SwapVolumeStats> => {
      const { poolAddress, since, timeframe } = params ?? {};

      setError(null);
      setLoading(true);

      const { data, error: e } = await supabase
        .from('realtime goldsky')
        .select('*')
        .eq('contract_id', POOL_ROUTER_CONTRACT_ID)
        .order('timestamp', { ascending: false });

      if (e) {
        Sentry.captureException(e);
        setError(e as any);
        console.error('Error fetching swap volume:', e);
        return emptyStats();
      }

      const now = Date.now();
      const sinceTime = timeframe ? now - timeframesInMs[timeframe] : since ? since.getTime() : 0;

      const result: SwapVolumeStats = emptyStats();

      for (const row of data) {
        if (!row.topics || row.topics[0] !== 'trade') continue;

        const eventTime = new Date(row.timestamp).getTime();
        if (eventTime < sinceTime) continue;

        if (poolAddress && row.topics[1] !== poolAddress) continue; // topics[1] = token_in

        const [inAmount, outAmount] = parseTradeAmounts(row.data);
        if (inAmount === null || outAmount === null) continue;

        result.volume += outAmount;
        result.trades += 1;
      }

      return result;
    },
    []
  );

  return {
    error,
    loading,
    getSwapVolume,
  };
}

function parseTradeAmounts(data: any): [number | null, number | null] {
  try {
    const [inAmount, outAmount] = typeof data === 'string' ? JSON.parse(data) : data;
    return [Number(inAmount), Number(outAmount)];
  } catch {
    return [null, null];
  }
}

function emptyStats(): SwapVolumeStats {
  return {
    volume: 0,
    trades: 0,
  };
}

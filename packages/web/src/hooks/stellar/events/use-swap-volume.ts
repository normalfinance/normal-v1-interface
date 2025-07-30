'use client';

import type { ChartTimeframeKey } from '@/components/_pool-page-components';

import * as Sentry from '@sentry/nextjs';
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { constants, convertContractAddressToHex } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  getSwapVolume: (params?: GetSwapVolumeParams) => Promise<SwapVolumeStats>;
}

type SwapVolumeStats = Record<
  ChartTimeframeKey,
  {
    volume: number;
  }
>;

type GetSwapVolumeParams =
  | undefined
  | {
      timeframe?: ChartTimeframeKey;
      since?: Date;
      poolAddress?: string;
    };

const timeframesInMs: Record<ChartTimeframeKey, number> = {
  '24h': 1 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '12m': 365 * 24 * 60 * 60 * 1000,
};

// ----------------------------------------------------------------------

const POOL_ROUTER_CONTRACT_ID = convertContractAddressToHex(
  constants.StellarConfig.POOL_ROUTER_ADDRESS
);

export function useSwapVolume(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const getSwapVolume = useCallback(
    async (params?: GetSwapVolumeParams): Promise<SwapVolumeStats> => {
      const { poolAddress, since, timeframe } = params ?? {};

      setError(null);
      setLoading(true);

      const { data, error: e } = await supabase
        .from('goldsky')
        .select('*')
        .eq('contract_id', POOL_ROUTER_CONTRACT_ID)
        .eq('type', 'contract')
        .eq('in_successful_contract_call', true)
        .order('id', { ascending: false });

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

        result[timeframe!].volume += outAmount;
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
    '24h': {
      volume: 0,
    },
    '7d': {
      volume: 0,
    },
    '30d': {
      volume: 0,
    },
    '12m': {
      volume: 0,
    },
  };
}

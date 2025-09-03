'use client';

import type { events } from '@normalfinance/types';
import type { ChartTimeframeKey } from '@/components/_pool-page-components';
import type { GoldskyTableRow } from '@normalfinance/types/build/contracts/events';

import { BigNumber } from 'bignumber.js';
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { constants, parseEvent } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  allSwaps: events.RouterSwapEvent[];
  getSwapVolume: (params?: GetSwapVolumeParams) => Promise<SwapVolumeStats>;
}

type SwapVolumeStats = Record<
  ChartTimeframeKey,
  {
    volume: BigNumber;
  }
>;

type GetSwapVolumeParams =
  | undefined
  | {
      since?: Date;
      asset?: string;
    };

// windows (in ms) for each timeframe
export const TF_WINDOWS: Record<ChartTimeframeKey, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '12m': 365 * 24 * 60 * 60 * 1000, // approximate 12 months
};

// ----------------------------------------------------------------------

const TIMESTAMP_COLUMN = 'ledger_closed_at';

export function useSwapVolume(): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [allSwaps, setAllSwaps] = useState<events.RouterSwapEvent[]>([]);

  const getSwapVolume = useCallback(
    async (params?: GetSwapVolumeParams): Promise<SwapVolumeStats> => {
      const { asset, since } = params ?? {};

      setError(null);
      setLoading(true);

      // Build topics filter
      let topicsPattern = '%swap%';
      if (asset && String(asset).trim()) {
        topicsPattern += `%${String(asset).trim()}%`;
      }

      // Map timeframe to a Date
      const windowStartFromTimeframe = (tf: ChartTimeframeKey): Date => {
        const now = new Date();
        const d = new Date(now);
        // eslint-disable-next-line default-case
        switch (tf) {
          case '24h':
            d.setHours(d.getHours() - 24);
            break;
          case '7d':
            d.setDate(d.getDate() - 7);
            break;
          case '30d':
            d.setDate(d.getDate() - 30);
            break;
          case '12m':
            d.setMonth(d.getMonth() - 12);
            break;
        }
        return d;
      };

      // Compute start bound
      let startBound: Date | undefined;
      const nowIso = new Date().toISOString();

      if (since instanceof Date && !isNaN(since.getTime())) {
        startBound = startBound ? new Date(Math.max(startBound.getTime(), since.getTime())) : since;
      }

      // Build query progressively
      let query = supabase
        .from(constants.StellarConfig.EVENTS_TABLENAME)
        .select('*')
        .eq('contract_id', constants.StellarConfig.POOL_ROUTER_ADDRESS)
        .eq('type', 'contract')
        .eq('in_successful_contract_call', true)
        .eq('transaction_successful', true)
        .ilike('topics', topicsPattern);

      // Apply time filters if any
      if (startBound) {
        query = query.gte(TIMESTAMP_COLUMN, startBound.toISOString()).lte(TIMESTAMP_COLUMN, nowIso);
      } else {
        query = query
          .gte(TIMESTAMP_COLUMN, windowStartFromTimeframe('12m').toISOString())
          .lte(TIMESTAMP_COLUMN, nowIso);
      }

      query = query.order('id', { ascending: false });

      const { data, error: e } = await query;

      if (e) {
        setError(e as any);
        console.error('Error fetching swap volume:', e);
        return emptyStats();
      } else {
        const rows = data as GoldskyTableRow[];
        const result: SwapVolumeStats = emptyStats();

        // TODO: save all rows to allSwaps
        setAllSwaps([]);

        const now = Date.now();

        const keysToCompute: ChartTimeframeKey[] = [
          '24h',
          '7d',
          '30d',
          '12m',
        ] as ChartTimeframeKey[];

        // Precompute start boundaries for each key, factoring in optional `since`
        const sinceMs =
          since instanceof Date && !isNaN(since.getTime()) ? since.getTime() : undefined;

        const startBoundByKey: Record<ChartTimeframeKey, number> = {
          '24h': Math.max(now - TF_WINDOWS['24h'], sinceMs ?? -Infinity),
          '7d': Math.max(now - TF_WINDOWS['7d'], sinceMs ?? -Infinity),
          '30d': Math.max(now - TF_WINDOWS['30d'], sinceMs ?? -Infinity),
          '12m': Math.max(now - TF_WINDOWS['12m'], sinceMs ?? -Infinity),
        };

        rows
          .filter((r) => r.topics !== undefined && r.data !== undefined)
          .forEach((r) => {
            const rowDate = getRowDate(r);
            if (!rowDate) return;

            const rowMs = rowDate.getTime();
            if (rowMs > now) return; // ignore future-dated rows

            const parsedEvent = parseEvent(
              JSON.parse(r.topics!),
              JSON.parse(r.data!),
              r.transaction_hash
            ) as events.RouterSwapEvent;

            const buying = parsedEvent.direction === 'Buy';
            const inAmt = parsedEvent.inAmount;
            const outAmt = parsedEvent.outAmount;
            const amount = buying ? inAmt : outAmt;

            // Increment every applicable timeframe bucket
            for (const key of keysToCompute) {
              const startMs = startBoundByKey[key];
              if (rowMs >= startMs) {
                result[key].volume = result[key].volume.plus(amount);
              }
            }
          });

        return result;
      }
    },
    []
  );

  return {
    error,
    loading,
    allSwaps,
    getSwapVolume,
  };
}

// best-effort timestamp extraction from a Goldsky row
const getRowDate = (r: GoldskyTableRow): Date | null => {
  // Adjust these field names to match your table shape
  const ts = (r as any)[TIMESTAMP_COLUMN];

  if (!ts) return null;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
};

function emptyStats(): SwapVolumeStats {
  return {
    '24h': {
      volume: BigNumber(0),
    },
    '7d': {
      volume: BigNumber(0),
    },
    '30d': {
      volume: BigNumber(0),
    },
    '12m': {
      volume: BigNumber(0),
    },
  };
}

'use client';

import type { events } from '@normalfinance/types';
import type { GoldskyTableRow } from '@normalfinance/types/build/contracts/events';
import type { ChartTimeframeKey, ExplorerChartData } from '@/components/_pool-page-components';

import { useState, useEffect } from 'react';
import { captureException } from '@sentry/nextjs';
import { supabase } from '@/lib/createSupabaseClient';
import { createChartData } from '@/utils/portfolio-value-chart-series';
import { constants, rpcServer, parseEvent } from '@normalfinance/utils';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  chartData: ExplorerChartData; //Record<ChartTimeframeKey, RealtimeChartData>;
}

const timeframeDurations: Record<ChartTimeframeKey, number> = {
  '24h': 1 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '12m': 365 * 24 * 60 * 60 * 1000,
};

const bucketCounts: Record<ChartTimeframeKey, number> = {
  '24h': 24,
  '7d': 7,
  '30d': 31,
  '12m': 12,
};

// ----------------------------------------------------------------------

export function usePoolPriceChart(
  asset: string,
  swapHistory: events.RouterSwapEvent[] = []
): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // const [chartData, setChartData] = useState<Record<ChartTimeframeKey, RealtimeChartData>>({
  //   '24h': createChartData('24h', [], 8),
  //   '7d': createChartData('7d', [], 7),
  //   '30d': createChartData('30d', [], 8),
  //   '12m': createChartData('12m', [], 12),
  // });
  const [chartData, setChartData] = useState<ExplorerChartData>({
    price: {
      '24h': createChartData('24h', [], 8),
      '7d': createChartData('7d', [], 7),
      '30d': createChartData('30d', [], 8),
      '12m': createChartData('12m', [], 12),
    },
    volume: {
      '24h': createChartData('24h', [], 8),
      '7d': createChartData('7d', [], 7),
      '30d': createChartData('30d', [], 8),
      '12m': createChartData('12m', [], 12),
    },
  });

  useEffect(() => {
    if (!swapHistory || swapHistory.length === 0) {
      // TODO: get swaps
    }
  }, [swapHistory]);

  useEffect(() => {
    if (!asset) return;

    const now = Date.now();

    const fetchPriceData = async () => {
      const blocksPerYear = (365 * 24 * 60 * 60) / 5;
      const ledger = await rpcServer.getLatestLedger();
      const ledgerOneYearAgo = ledger.sequence - blocksPerYear;

      const { data, error: e } = await supabase
        .from(constants.StellarConfig.EVENTS_TABLENAME)
        .select('*')
        .eq('contract_id', constants.StellarConfig.POOL_ROUTER_ADDRESS)
        .eq('type', 'contract')
        .eq('in_successful_contract_call', true)
        .eq('transaction_successful', true)
        .ilike('topics', `%rebalance%`)
        .gte('ledger_sequence', ledgerOneYearAgo)
        .order('id', { ascending: true });

      if (e) {
        captureException(e);
        setError(e as any);
        return;
      }

      const rows = data as GoldskyTableRow[];

      const result: ExplorerChartData = { price: {}, volume: {} };

      (['24h', '7d', '30d', '12m'] as ChartTimeframeKey[]).forEach(async (tf) => {
        const duration = timeframeDurations[tf];
        const buckets = bucketCounts[tf];
        const bucketSize = duration / buckets;

        const priceBuckets: number[][] = Array.from({ length: buckets }, () => []);

        for (const row of rows) {
          const tx = await rpcServer.getTransaction(row.transaction_hash);

          if (tx.status == 'SUCCESS') {
            const ts = new Date(tx.createdAt).getTime();
            if (now - ts > duration) continue;

            const bucketIndex = Math.floor((ts - (now - duration)) / bucketSize);
            if (bucketIndex < 0 || bucketIndex >= buckets) continue;

            const parsed = parseEvent(
              JSON.parse(row.topics!),
              JSON.parse(row.data!),
              row.transaction_hash
            ) as events.RebalanceEvent;

            if (Number(parsed.newReserveA) === 0 || Number(parsed.newReserveB) === 0) continue;

            const price = parsed.newReserveB / parsed.newReserveA;
            priceBuckets[bucketIndex].push(Number(price));
          }
        }

        const averagedPrices = priceBuckets.map((p) =>
          p.length ? p.reduce((a, b) => a + b, 0) / p.length : 0
        );

        result.price![tf] = createChartData(tf, averagedPrices, tickCount(tf));
      });

      setChartData({ ...chartData, price: result.price });
    };

    const fetchVolumeData = async () => {
      const blocksPerYear = (365 * 24 * 60 * 60) / 5;
      const ledger = await rpcServer.getLatestLedger();
      const ledgerOneYearAgo = ledger.sequence - blocksPerYear;

      const { data, error: e } = await supabase
        .from(constants.StellarConfig.EVENTS_TABLENAME)
        .select('*')
        .eq('contract_id', constants.StellarConfig.POOL_ROUTER_ADDRESS)
        .eq('type', 'contract')
        .eq('in_successful_contract_call', true)
        .eq('transaction_successful', true)
        .ilike('topics', `%swap%`)
        .gte('ledger_sequence', ledgerOneYearAgo)
        .order('id', { ascending: true });

      if (e) {
        captureException(e);
        setError(e as any);
        return;
      }

      const rows = data as GoldskyTableRow[];

      const result: ExplorerChartData = { price: {}, volume: {} };

      (['24h', '7d', '30d', '12m'] as ChartTimeframeKey[]).forEach(async (tf) => {
        const duration = timeframeDurations[tf];
        const buckets = bucketCounts[tf];
        const bucketSize = duration / buckets;

        // const volumeBuckets: number[] = Array.from({ length: buckets }, () => 0);
        const volumeBuckets: number[][] = Array.from({ length: buckets }, () => []);

        for (const row of rows) {
          const tx = await rpcServer.getTransaction(row.transaction_hash);

          if (tx.status == 'SUCCESS') {
            const ts = new Date(tx.createdAt).getTime();
            if (now - ts > duration) continue;

            const bucketIndex = Math.floor((ts - (now - duration)) / bucketSize);
            if (bucketIndex < 0 || bucketIndex >= buckets) continue;

            const parsed = parseEvent(
              JSON.parse(row.topics!),
              JSON.parse(row.data!),
              row.transaction_hash
            ) as events.SwapEvent;

            const volume = parsed.direction === 'Buy' ? parsed.inAmount : parsed.outAmount;
            // volumeBuckets[bucketIndex] += volumeUsd;

            // const price = parsed.newReserveB / parsed.newReserveA;
            volumeBuckets[bucketIndex].push(Number(volume));
          }
        }

        const averagedPrices = volumeBuckets.map((p) =>
          p.length ? p.reduce((a, b) => a + b, 0) / p.length : 0
        );

        result.volume![tf] = createChartData(tf, averagedPrices, tickCount(tf));
      });

      setChartData({ ...chartData, volume: result.volume });
    };

    fetchPriceData();
    fetchVolumeData();
  }, [asset]);

  return {
    error,
    loading,
    chartData,
  };
}

function tickCount(tf: ChartTimeframeKey): number {
  return tf === '24h' ? 8 : tf === '7d' ? 7 : tf === '12m' ? 12 : 8;
}

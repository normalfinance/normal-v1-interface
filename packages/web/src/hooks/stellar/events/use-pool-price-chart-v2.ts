'use client';

import type { RealtimeChartData } from '@/utils/portfolio-value-chart-series';
import type { ChartTimeframeKey, ExplorerChartData } from '@/components/_pool-page-components';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { createChartData } from '@/utils/portfolio-value-chart-series';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  chartData: Record<ChartTimeframeKey, RealtimeChartData>;
}
type RebalanceRow = {
  timestamp: string;
  data: string | [string, string];
  topics: string[];
};

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

export function usePoolPriceChartv2(poolAddress: string): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [chartData, setChartData] = useState<Record<ChartTimeframeKey, RealtimeChartData>>({
    '24h': createChartData('24h', [], 8),
    '7d': createChartData('7d', [], 7),
    '30d': createChartData('30d', [], 8),
    '12m': createChartData('12m', [], 12),
  });

  useEffect(() => {
    if (!poolAddress) return;

    const now = Date.now();

    const fetchInitialData = async () => {
      const { data, error: e } = await supabase
        .from('realtime goldsky')
        .select('*')
        .eq('contract_id', poolAddress)
        .contains('topics', ['rebalance'])
        .order('timestamp', { ascending: true });

      if (e) {
        console.error('Error loading rebalance events:', e);
        return;
      }

      const rows = data as RebalanceRow[];

      const result: ExplorerChartData = { price: {}, volume: {} };

      (['24h', '7d', '30d', '12m'] as ChartTimeframeKey[]).forEach((tf) => {
        const duration = timeframeDurations[tf];
        const buckets = bucketCounts[tf];
        const bucketSize = duration / buckets;

        const priceBuckets: number[][] = Array.from({ length: buckets }, () => []);
        const volumeBuckets: number[] = Array.from({ length: buckets }, () => 0);

        let prevReserveA = 0;
        let prevReserveB = 0;

        for (const row of rows) {
          const ts = new Date(row.timestamp).getTime();
          if (now - ts > duration) continue;

          const bucketIndex = Math.floor((ts - (now - duration)) / bucketSize);
          if (bucketIndex < 0 || bucketIndex >= buckets) continue;

          const [a, b] = parseReserves(row.data);
          if (a === 0 || b === 0) continue;

          const price = b / a;
          priceBuckets[bucketIndex].push(price);

          if (prevReserveA !== 0 || prevReserveB !== 0) {
            const deltaA = Math.abs(a - prevReserveA);
            const deltaB = Math.abs(b - prevReserveB);
            volumeBuckets[bucketIndex] += deltaA + deltaB;
          }

          prevReserveA = a;
          prevReserveB = b;
        }

        const averagedPrices = priceBuckets.map((p) =>
          p.length ? p.reduce((a, b) => a + b, 0) / p.length : 0
        );

        result.price![tf] = createChartData(tf, averagedPrices, tickCount(tf));
        result.volume![tf] = createChartData(tf, volumeBuckets, tickCount(tf));
      });
    };

    fetchInitialData();
  }, [poolAddress]);

  return {
    error,
    loading,
    chartData,
  };
}

function parseReserves(data: any): [number, number] {
  try {
    const [a, b] = typeof data === 'string' ? JSON.parse(data) : data;
    return [Number(a), Number(b)];
  } catch {
    return [0, 0];
  }
}

function tickCount(tf: ChartTimeframeKey): number {
  return tf === '24h' ? 8 : tf === '7d' ? 7 : tf === '12m' ? 12 : 8;
}

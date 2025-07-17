'use client';

import type { ChartTimeframeKey } from '@/components/_pool-page-components';
import type { RealtimeChartData } from '@/utils/portfolio-value-chart-series';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { createChartData } from '@/utils/portfolio-value-chart-series';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  chartData: Record<ChartTimeframeKey, RealtimeChartData>;
}

type PricePoint = {
  timestamp: number;
  price: number;
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

      const pricePoints: PricePoint[] = data
        .map((row: any) => {
          const timestamp = new Date(row.timestamp).getTime();
          const [reserveA, reserveB] = parseReserves(row.data);
          if (reserveA === 0 || reserveB === 0) return null;
          return { timestamp, price: reserveB / reserveA };
        })
        .filter(Boolean) as PricePoint[];

      const chartBuckets = computeChartBuckets(pricePoints, now);
      setChartData(chartBuckets);
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

function computeChartBuckets(
  pricePoints: PricePoint[],
  now: number
): Record<ChartTimeframeKey, RealtimeChartData> {
  const result: Record<ChartTimeframeKey, RealtimeChartData> = {} as any;

  (['24h', '7d', '30d', '12m'] as ChartTimeframeKey[]).forEach((tf) => {
    const duration = timeframeDurations[tf];
    const buckets = bucketCounts[tf];
    const bucketSize = duration / buckets;
    const points: number[][] = Array.from({ length: buckets }, () => []);

    for (const point of pricePoints) {
      if (now - point.timestamp > duration) continue;
      const bucketIndex = Math.floor((point.timestamp - (now - duration)) / bucketSize);
      if (bucketIndex >= 0 && bucketIndex < buckets) {
        points[bucketIndex].push(point.price);
      }
    }

    const averaged = points.map((arr) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    );

    result[tf] = createChartData(
      tf,
      averaged,
      tf === '24h' ? 8 : tf === '7d' ? 7 : tf === '12m' ? 12 : 8
    );
  });

  return result;
}

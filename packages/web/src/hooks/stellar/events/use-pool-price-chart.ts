'use client';

import type { TimeEpoch } from '@normalfinance/types';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/createSupabaseClient';

// ----------------------------------------------------------------------

interface ReturnType {
  error: any | null;
  loading: boolean;
  prices: PriceBuckets;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

type PriceBuckets = Record<TimeEpoch, PricePoint[]>;

// ----------------------------------------------------------------------

export function usePoolPriceChart(poolAddress: string): ReturnType {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [prices, setPrices] = useState<PriceBuckets>({
    '1D': [],
    '7D': [],
    '30D': [],
    '12M': [],
  });

  useEffect(() => {
    if (!poolAddress) return;

    const now = Date.now();

    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('realtime goldsky')
        .select('*')
        .eq('contract_id', poolAddress)
        .contains('topics', ['rebalance'])
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading rebalance events:', error);
        return;
      }

      const parsed = parsePricePoints(data, now);
      setPrices(parsed);
    };

    fetchInitialData();

    const channel = supabase
      .channel(`realtime:rebalance:${poolAddress}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'goldsky',
          filter: `contract_id=eq.${poolAddress}`,
        },
        (payload) => {
          if (payload.new.topics?.[0] !== 'rebalance') return;

          const timestamp = new Date(payload.new.timestamp).getTime();
          const [reserveA, reserveB] = parseReserves(payload.new.data);
          if (reserveA === 0 || reserveB === 0) return;

          const price = reserveB / reserveA;
          setPrices((prev) => {
            const updated: PriceBuckets = { ...prev };
            for (const [key, maxAge] of Object.entries(timeframes)) {
              if (Date.now() - timestamp <= maxAge) {
                updated[key as Timeframe] = [...updated[key as Timeframe], { timestamp, price }];
              }
            }
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poolContractId]);

  return {
    error,
    loading,
    prices,
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

function parsePricePoints(rows: any[], now: number): PriceBuckets {
  const result: PriceBuckets = {
    '1D': [],
    '7D': [],
    '30D': [],
    '12M': [],
  };

  for (const row of rows) {
    if (row.topics?.[0] !== 'rebalance') continue;

    const timestamp = new Date(row.timestamp).getTime();
    const [a, b] = parseReserves(row.data);
    if (a === 0 || b === 0) continue;

    const price = b / a;

    for (const [key, maxAge] of Object.entries(timeframes)) {
      if (now - timestamp <= maxAge) {
        result[key as Timeframe].push({ timestamp, price });
      }
    }
  }

  return result;
}

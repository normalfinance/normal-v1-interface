import type { AssetMarket } from '@/lib/prices/markets';

import useSWR from 'swr';
import { useMemo } from 'react';

// ---------------------------------------------------------------------------
// Market data for every listed asset (market cap, 24h range, supply, all-time
// high, a 24-hour sparkline) from our cached /api/prices/markets. One request
// serves every page that asks: SWR shares it by key.
// ---------------------------------------------------------------------------

interface MarketsResponse {
  success: boolean;
  markets: AssetMarket[];
}

async function fetcher(url: string): Promise<MarketsResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load market data (${res.status})`);
  return res.json();
}

export function useMarkets(enabled = true) {
  const { data, error, isLoading } = useSWR(enabled ? '/api/prices/markets' : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    // The server refreshes every five minutes; asking more often gains nothing.
    refreshInterval: 300_000,
    errorRetryCount: 3,
  });

  const markets = useMemo(
    () =>
      Object.fromEntries((data?.markets ?? []).map((m) => [m.symbol, m])) as Record<
        string,
        AssetMarket | undefined
      >,
    [data]
  );

  return { markets, isLoading, error };
}

import useSWR from 'swr';

// ---------------------------------------------------------------------------
// Price history for an asset via our cached /api/prices/history proxy.
// `enabled: false` skips the request entirely (unsupported assets).
// ---------------------------------------------------------------------------

export type PriceRange = '1d' | '1w' | '1m' | '1y' | '5y' | 'all';

export const PRICE_HISTORY_SYMBOLS = ['BTC', 'XLM', 'USDC', 'ETH', 'SOL'];

interface PriceHistoryResponse {
  success: boolean;
  prices: [number, number][];
}

async function fetcher(url: string): Promise<PriceHistoryResponse> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load price history (${res.status})`);
  }
  return res.json();
}

export function usePriceHistory(symbol: string, range: PriceRange, enabled = true) {
  const { data, error, isLoading, isValidating } = useSWR(
    enabled ? `/api/prices/history?symbol=${symbol}&range=${range}` : null,
    fetcher,
    // keepPreviousData: switching ranges shows the old curve until the new one
    // lands instead of flashing empty. Retries: a cold upstream cache often
    // fails the FIRST call and succeeds seconds later — consumers must treat
    // "error but still retrying" as loading, not failure (isValidating stays
    // true through retries).
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      keepPreviousData: true,
      errorRetryCount: 4,
    }
  );

  return {
    prices: data?.prices ?? [],
    isLoading,
    isValidating,
    error,
  };
}

/**
 * Several assets' histories over one range, read together (an index's coins,
 * whose line needs every coin): one request per asset through the same cached
 * route, held as one entry, so the line changes only when all have arrived.
 */
export function usePriceHistories(symbols: readonly string[], range: PriceRange) {
  const { data, error, isLoading, isValidating } = useSWR(
    symbols.length ? (['price-histories', symbols.join(','), range] as const) : null,
    async ([, list, r]: readonly [string, string, PriceRange]) => {
      const entries = await Promise.all(
        list.split(',').map(async (symbol) => {
          const res = await fetcher(`/api/prices/history?symbol=${symbol}&range=${r}`);
          return [symbol, res.prices] as const;
        })
      );
      return Object.fromEntries(entries) as Record<string, [number, number][]>;
    },
    // As one asset's history: the old line stays while a new range loads, and
    // a cold upstream's first failure is retried.
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      keepPreviousData: true,
      errorRetryCount: 4,
    }
  );

  return { histories: data ?? null, isLoading, isValidating, error };
}

/**
 * Latest USD price for an asset (last point of the cached 1d series).
 * Used to price synthesized zero-balance tokens (BTC/ETH/SOL before the
 * user has an address) — the token store only knows Stellar assets.
 */
export function useUsdPrice(symbol: string, enabled = true): number {
  const { prices } = usePriceHistory(
    symbol,
    '1d',
    enabled && PRICE_HISTORY_SYMBOLS.includes(symbol)
  );
  return prices.length ? prices[prices.length - 1][1] : 0;
}

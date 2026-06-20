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
  const { data, error, isLoading } = useSWR(
    enabled ? `/api/prices/history?symbol=${symbol}&range=${range}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  return {
    prices: data?.prices ?? [],
    isLoading,
    error,
  };
}

/**
 * Latest USD price for an asset (last point of the cached 1d series).
 * Used to price synthesized zero-balance tokens (BTC/ETH/SOL before the
 * user has an address) — the token store only knows Stellar assets.
 */
export function useUsdPrice(symbol: string, enabled = true): number {
  const { prices } = usePriceHistory(symbol, '1d', enabled && PRICE_HISTORY_SYMBOLS.includes(symbol));
  return prices.length ? prices[prices.length - 1][1] : 0;
}

// ---------------------------------------------------------------------------
// Market data for the assets we list: the shape the app reads, and the one
// place that turns CoinGecko's /coins/markets answer into it. Client-safe:
// the route (app/api/prices/markets) fetches and caches, the pages read the
// same type through useMarkets.
// ---------------------------------------------------------------------------

/** Our symbol → CoinGecko's coin id. */
export const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  XLM: 'stellar',
  USDC: 'usd-coin',
  ETH: 'ethereum',
  SOL: 'solana',
};

export interface AssetMarket {
  symbol: string;
  /** USD. */
  price: number;
  /** Price change over the last 24 hours, in percent. */
  change24h: number | null;
  marketCap: number | null;
  /** Position by market cap among all coins (1 = largest). */
  rank: number | null;
  /** USD traded in the last 24 hours. */
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
  circulatingSupply: number | null;
  /** Null when the coin has no fixed limit. */
  maxSupply: number | null;
  ath: number | null;
  /** How far today's price is from the all-time high, in percent (≤ 0). */
  athChangePct: number | null;
  /** ISO date of the all-time high. */
  athDate: string | null;
  /** Hourly prices over the last 24 hours, oldest first, ending on `price`. */
  sparkline24h: number[];
}

const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Six significant digits: plenty for a 32px line, a third of the payload. */
const trim = (value: number) => Number(value.toPrecision(6));

/** Points kept from CoinGecko's hourly 7-day sparkline: the last day, both ends. */
const HOURS_IN_DAY = 24;

/**
 * CoinGecko's /coins/markets rows → AssetMarket, ours only, in our symbols.
 * Rows that don't parse are dropped, never guessed at.
 */
export function normalizeMarkets(raw: unknown): AssetMarket[] {
  if (!Array.isArray(raw)) return [];
  const symbolById = Object.fromEntries(Object.entries(COINGECKO_IDS).map(([s, id]) => [id, s]));

  return raw.flatMap((row): AssetMarket[] => {
    const symbol = symbolById[(row as { id?: string })?.id ?? ''];
    const price = finite(row?.current_price);
    if (!symbol || price === null) return [];

    const hourly: number[] = Array.isArray(row?.sparkline_in_7d?.price)
      ? (row.sparkline_in_7d.price as unknown[]).flatMap((v) => {
          const n = finite(v);
          return n === null ? [] : [n];
        })
      : [];
    // The last day, ending on the price shown beside it: the hourly series
    // stops at the top of the hour.
    const sparkline24h = [...hourly.slice(-(HOURS_IN_DAY + 1)), price].map(trim);

    return [
      {
        symbol,
        price,
        change24h: finite(row?.price_change_percentage_24h),
        marketCap: finite(row?.market_cap),
        rank: finite(row?.market_cap_rank),
        volume24h: finite(row?.total_volume),
        high24h: finite(row?.high_24h),
        low24h: finite(row?.low_24h),
        circulatingSupply: finite(row?.circulating_supply),
        maxSupply: finite(row?.max_supply),
        ath: finite(row?.ath),
        athChangePct: finite(row?.ath_change_percentage),
        athDate: typeof row?.ath_date === 'string' ? row.ath_date : null,
        sparkline24h: sparkline24h.length > 2 ? sparkline24h : [],
      },
    ];
  });
}

/** Coins pegged to a currency: their lines are drawn against a wider range. */
const STABLECOINS = new Set(['USDC']);

/**
 * The least range a coin's price line spans, as a share of its price: 2% for
 * coins that trade freely, 10% for a digital dollar, whose wobbles of a
 * hundredth of a cent are noise and should draw as the flat line they are.
 */
export const minSpanFor = (symbol: string) => (STABLECOINS.has(symbol.toUpperCase()) ? 0.1 : 0.02);

/**
 * The vertical range a price line is drawn in. A line always spans at least
 * `minRelativeSpan` of its price, so a coin that barely moved (a digital
 * dollar wobbling by a hundredth of a cent) draws flat instead of being
 * zoomed into a scary zigzag.
 */
export function priceDomain(values: number[], minRelativeSpan = 0.02) {
  if (!values.length) return { min: 0, max: 1 };
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const mid = (lo + hi) / 2;
  const span = Math.max(hi - lo, Math.abs(mid) * minRelativeSpan) || 1;
  return { min: mid - span / 2, max: mid + span / 2 };
}

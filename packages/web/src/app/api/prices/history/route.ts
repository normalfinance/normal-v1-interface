import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';

// ---------------------------------------------------------------------------
// Price history proxy behind a Redis cache so all visitors share one upstream
// call per asset/range.
//
// Two providers, both free:
// - 1d/1w/1m/1y → CoinGecko market_chart (history beyond 365 days is
//   paid-only there; COINGECKO_API_KEY optional, keyless works at our volume)
// - 5y/all      → Kraken public weekly OHLC (keyless, BTC back to 2013)
// ---------------------------------------------------------------------------

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  XLM: 'stellar',
  USDC: 'usd-coin',
  ETH: 'ethereum',
  SOL: 'solana',
};

const SYMBOL_TO_KRAKEN_PAIR: Record<string, string> = {
  BTC: 'XBTUSD',
  XLM: 'XLMUSD',
  USDC: 'USDCUSD',
  ETH: 'ETHUSD',
  SOL: 'SOLUSD',
};

const RANGE_TO_DAYS: Record<string, number> = {
  '1d': 1,
  '1w': 7,
  '1m': 30,
  '1y': 365,
};

const LONG_RANGES = new Set(['5y', 'all']);

// Long ranges barely change — cache them much longer than intraday data.
const RANGE_TO_TTL_SECONDS: Record<string, number> = {
  '1d': 600,
  '1w': 600,
  '1m': 1800,
  '1y': 21600,
  '5y': 21600,
  all: 21600,
};

async function fetchCoinGecko(symbol: string, days: number): Promise<number[][] | null> {
  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
  }
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${SYMBOL_TO_COINGECKO_ID[symbol]}/market_chart?vs_currency=usd&days=${days}`,
    { headers, cache: 'no-store' }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data?.prices) ? data.prices : null;
}

// Kraken weekly OHLC returns up to ~720 candles (~13 years) in one call.
// Rows: [time(sec), open, high, low, close, vwap, volume, count]
async function fetchKrakenWeekly(symbol: string, range: string): Promise<number[][] | null> {
  const pair = SYMBOL_TO_KRAKEN_PAIR[symbol];
  const res = await fetch(`https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=10080`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.error?.length) return null;

  const resultKey = Object.keys(data?.result ?? {}).find((key) => key !== 'last');
  const rows = resultKey ? (data.result[resultKey] as unknown[][]) : null;
  if (!Array.isArray(rows)) return null;

  let prices = rows.map((row) => [Number(row[0]) * 1000, parseFloat(String(row[4]))]);
  if (range === '5y') {
    const cutoff = Date.now() - 5 * 365 * 24 * 60 * 60 * 1000;
    prices = prices.filter(([ts]) => ts >= cutoff);
  }
  return prices;
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.toUpperCase() ?? '';
  const range = request.nextUrl.searchParams.get('range') ?? '1w';

  if (!SYMBOL_TO_COINGECKO_ID[symbol]) {
    return NextResponse.json({ success: false, error: 'Unsupported asset' }, { status: 404 });
  }
  const isLongRange = LONG_RANGES.has(range);
  if (!isLongRange && !RANGE_TO_DAYS[range]) {
    return NextResponse.json({ success: false, error: 'Invalid range' }, { status: 400 });
  }

  const cacheKey = `prices:history:${symbol}:${range}`;

  try {
    const cached = await redis.get<number[][]>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, prices: cached });
    }
  } catch {
    // Cache unavailable — fall through to the upstream call
  }

  const prices = isLongRange
    ? await fetchKrakenWeekly(symbol, range)
    : await fetchCoinGecko(symbol, RANGE_TO_DAYS[range]);

  if (!prices) {
    // Doc 90 W3: a 429 burst used to empty the chart although an older
    // series existed — serve it, marked stale.
    try {
      const stale = await redis.get<[number, number][]>(`stale:${cacheKey}`);
      if (stale?.length) {
        console.warn('[prices/history] serving stale series for', symbol, range);
        return NextResponse.json({ success: true, prices: stale, stale: true });
      }
    } catch {
      /* no stale copy */
    }
    return NextResponse.json({ success: false, error: 'Price provider error' }, { status: 502 });
  }

  try {
    await redis.set(cacheKey, prices, { ex: RANGE_TO_TTL_SECONDS[range] ?? 600 });
    await redis.set(`stale:${cacheKey}`, prices, { ex: 7 * 24 * 3600 });
  } catch {
    // Cache write failure is non-fatal
  }

  return NextResponse.json({ success: true, prices });
}

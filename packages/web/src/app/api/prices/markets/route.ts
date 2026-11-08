import type { AssetMarket } from '@/lib/prices/markets';

import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';
import { COINGECKO_IDS, normalizeMarkets } from '@/lib/prices/markets';

// ---------------------------------------------------------------------------
// GET /api/prices/markets: market cap, 24h range, supply, all-time high and a
// 24-hour sparkline for every asset we list, from ONE CoinGecko /coins/markets
// call shared by every visitor through Redis (public data, no auth).
//
// Scale: the upstream sees at most one call per TTL whatever the traffic. A
// short lock makes one request refresh an expired copy while the rest serve
// the last good one, so an expiry can't burst into 429s; an outage serves the
// last good copy (up to a week old), marked stale.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'prices:markets:v1';
const STALE_KEY = `stale:${CACHE_KEY}`;
const LOCK_KEY = `lock:${CACHE_KEY}`;
const TTL_SECONDS = 300;
const STALE_TTL_SECONDS = 7 * 24 * 3600;

const HEADERS = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240' };

const ok = (markets: AssetMarket[], stale = false) =>
  NextResponse.json(
    { success: true, markets, ...(stale && { stale: true }) },
    { headers: HEADERS }
  );

async function readStale(): Promise<AssetMarket[] | null> {
  try {
    const stale = await redis.get<AssetMarket[]>(STALE_KEY);
    return stale?.length ? stale : null;
  } catch {
    return null;
  }
}

async function fetchMarkets(): Promise<AssetMarket[] | null> {
  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
  }
  const ids = Object.values(COINGECKO_IDS).join(',');
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`,
      { headers, cache: 'no-store', signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const markets = normalizeMarkets(await res.json());
    return markets.length ? markets : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const cached = await redis.get<AssetMarket[]>(CACHE_KEY);
    if (cached?.length) return ok(cached);
  } catch {
    // Cache unavailable: fall through to the upstream call
  }

  // One request refreshes; while it does, the others serve the last copy.
  let refresher = true;
  try {
    refresher = (await redis.set(LOCK_KEY, '1', { nx: true, ex: 15 })) === 'OK';
  } catch {
    // No lock without Redis: refresh, as before a cache existed
  }
  if (!refresher) {
    const stale = await readStale();
    if (stale) return ok(stale, true);
  }

  const markets = await fetchMarkets();
  if (!markets) {
    const stale = await readStale();
    if (stale) {
      console.warn('[prices/markets] serving the last good copy');
      return ok(stale, true);
    }
    return NextResponse.json(
      { success: false, error: 'Market data provider error' },
      { status: 502 }
    );
  }

  try {
    await redis.set(CACHE_KEY, markets, { ex: TTL_SECONDS });
    await redis.set(STALE_KEY, markets, { ex: STALE_TTL_SECONDS });
    await redis.del(LOCK_KEY);
  } catch {
    // A failed cache write is not the visitor's problem
  }

  return ok(markets);
}

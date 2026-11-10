import { NextResponse } from 'next/server';
import { readMarkets } from '@/server/markets';

// ---------------------------------------------------------------------------
// GET /api/prices/markets: market cap, 24h range, supply, all-time high and a
// 24-hour sparkline for every asset we list (public data, no auth). The read
// and its cache live in server/markets.ts, shared with the index purchase,
// which splits by these same market sizes.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

const HEADERS = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240' };

export async function GET() {
  const read = await readMarkets();
  if (!read) {
    return NextResponse.json(
      { success: false, error: 'Market data provider error' },
      { status: 502 }
    );
  }
  return NextResponse.json(
    { success: true, markets: read.markets, ...(read.stale && { stale: true }) },
    { headers: HEADERS }
  );
}

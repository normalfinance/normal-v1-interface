import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';
import { withRateLimitRetry } from '@/server/defindex';
import { isValidStellarAddress } from '@/utils/stellar-address';
import {
  fetchAllVaultEvents,
  normalizeVaultEvents,
  type SavingsHistoryEvent,
} from '@/server/defindex-events';

export const dynamic = 'force-dynamic';

// #53: full deposit/withdraw history for the REAL earnings chart. The list is
// append-only (it only changes when the user transacts), so a generous cache
// is safe and keeps the paginated upstream loop rare. Same source the
// reconciler trusts — the chart can never disagree with the totals.
const CACHE_TTL_SECONDS = 600;

// Same env names the user-position route resolves — one vault config.
const VAULTS: Record<string, string | undefined> = {
  mainnet: process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT,
  testnet: process.env.NEXT_PUBLIC_TESTNET_DEFINDEX_VAULT,
};

export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get('user') ?? '';
  const network = req.nextUrl.searchParams.get('network') === 'testnet' ? 'testnet' : 'mainnet';
  if (!isValidStellarAddress(user)) {
    return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
  }
  const vault = VAULTS[network];
  if (!vault) {
    return NextResponse.json({ success: false, error: 'Vault not configured' }, { status: 500 });
  }

  const cacheKey = `savings:history1:${user}:${network}`;
  try {
    const cached = await redis.get<SavingsHistoryEvent[]>(cacheKey);
    if (Array.isArray(cached)) {
      return NextResponse.json({ success: true, events: cached, cached: true });
    }
  } catch {
    /* cache unavailable — fetch */
  }

  try {
    const raw = await withRateLimitRetry(
      () => fetchAllVaultEvents(user, vault, network, process.env.DEFINDEX_API_KEY),
      'earningsHistory'
    );
    const events = normalizeVaultEvents(raw);
    try {
      await redis.set(cacheKey, events, { ex: CACHE_TTL_SECONDS });
    } catch {
      /* non-fatal */
    }
    return NextResponse.json({ success: true, events });
  } catch (e: any) {
    // No fabricated empty history: a failed upstream is an ERROR, so the
    // client keeps its cached curve instead of drawing a flat $0.
    return NextResponse.json({ success: false, error: String(e?.message ?? e) }, { status: 502 });
  }
}

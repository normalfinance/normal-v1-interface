import type { NextRequest } from 'next/server';

import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';

// ---------------------------------------------------------------------------
// POST /api/lifi/statuses
// Batch status lookup for recorded cross-chain swaps so the activity feed can
// mark them pending until the bridge delivers. Body: { swaps: [{txHash,
// fromSymbol, toSymbol}] } → { statuses: { [txHash]: 'DONE'|'PENDING'|'FAILED' } }.
// Each result cached in Redis (DONE long, PENDING short) so the feed is cheap.
// ---------------------------------------------------------------------------

const LIFI_CHAIN_IDS: Record<string, number> = {
  BTC: 20000000000001,
  ETH: 1,
  SOL: 1151111081099710,
};

async function lookupStatus(txHash: string, fromSymbol: string, toSymbol: string): Promise<string> {
  const cacheKey = `lifi:status:${txHash}`;
  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) return cached;
  } catch {
    /* ignore */
  }

  const params = new URLSearchParams({ txHash });
  const fromChain = LIFI_CHAIN_IDS[fromSymbol];
  const toChain = LIFI_CHAIN_IDS[toSymbol];
  if (fromChain) params.set('fromChain', String(fromChain));
  if (toChain) params.set('toChain', String(toChain));

  const headers: Record<string, string> = {};
  if (process.env.LIFI_API_KEY) headers['x-lifi-api-key'] = process.env.LIFI_API_KEY;

  let status = 'PENDING';
  try {
    const res = await fetch(`https://li.quest/v1/status?${params.toString()}`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json().catch(() => null);
    const s = data?.status as string | undefined;
    const sub = String(data?.substatus ?? '').toUpperCase();
    const msg = String(data?.message ?? '').toLowerCase();
    if (s === 'DONE') {
      // LI.FI marks a refund as DONE+REFUNDED (and partials as PARTIAL) — the
      // bridge "finished" but didn't deliver the destination asset.
      status = sub === 'REFUNDED' || sub === 'PARTIAL' ? 'REFUNDED' : 'DONE';
    } else if (s === 'FAILED' || s === 'INVALID') status = 'FAILED';
    // Source tx doesn't exist on-chain — the swap never started. The caller
    // combines this with the swap's age to decide failed vs. just-submitted.
    else if (msg.includes('not found')) status = 'NOTFOUND';
    else status = 'PENDING';
  } catch {
    status = 'PENDING';
  }

  try {
    // Terminal states cache long; transient (PENDING/NOTFOUND) refresh quickly.
    const terminal = status === 'DONE' || status === 'FAILED' || status === 'REFUNDED';
    await redis.set(cacheKey, status, { ex: terminal ? 86_400 : 30 });
  } catch {
    /* ignore */
  }
  return status;
}

// Authed since 2026-08-07: proxies LI.FI with our key; caller is the
// signed-in activity feed.
export const POST = withAuth(async (request: NextRequest) => {
  let body: { swaps?: { txHash: string; fromSymbol: string; toSymbol: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const swaps = (body.swaps ?? []).slice(0, 25);
  const entries = await Promise.all(
    swaps
      .filter((s) => s.txHash)
      .map(async (s) => [s.txHash, await lookupStatus(s.txHash, s.fromSymbol, s.toSymbol)] as const)
  );

  return NextResponse.json({ success: true, statuses: Object.fromEntries(entries) });
});

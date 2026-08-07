import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { redis } from '@/server/rateLimiter';
import { logger } from '@normalfinance/utils';
import { KNOWN_MEMO_REQUIRED } from '@/lib/stellar/memo-required-list';

// ---------------------------------------------------------------------------
// GET /api/stellar/memo-required?address=G…
// Does this Stellar account require a deposit memo? (finding #48 — a memo-less
// send to Coinbase's pooled account succeeded on-chain and was never credited)
//
// Two upstream sources, checked in order, result cached in Redis for 24h so
// thousands of users asking about the same handful of exchange addresses cost
// two upstream calls a day, total:
//   1. stellar.expert's community directory (tag: memo-required) — covers the
//      exchanges that never adopted SEP-29, which is most of them; Coinbase's
//      account carries no on-chain flag but IS in the directory.
//   2. The SEP-29 `config.memo_required` data entry on the account itself.
//
// Fails open ({required:false, degraded:true}) — the client keeps its own
// seed list for the major exchanges, and the SDK's submit-time SEP-29 check
// still runs behind everything.
//
// Authenticated (the withAuth-by-default rule, finding #44's lesson): an open
// route would be a free proxy to stellar.expert on our IP.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

const CACHE_TTL_SECONDS = 24 * 3600;
const UPSTREAM_TIMEOUT_MS = 5_000;

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;

interface MemoRequiredAnswer {
  required: boolean;
  name?: string;
  source?: 'seed' | 'directory' | 'sep29' | 'none';
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

export const GET = withAuth(async (request: NextRequest) => {
  const address = request.nextUrl.searchParams.get('address')?.trim().toUpperCase() ?? '';
  if (!STELLAR_ADDRESS.test(address)) {
    return NextResponse.json({ error: 'Invalid Stellar address' }, { status: 400 });
  }

  // Seed list — no upstream, no cache entry needed.
  const seedName = KNOWN_MEMO_REQUIRED.get(address);
  if (seedName) {
    return NextResponse.json({ required: true, name: seedName, source: 'seed' });
  }

  const cacheKey = `memo-required:${address}`;
  try {
    const cached = await redis.get<MemoRequiredAnswer>(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch {
    /* cache unavailable — ask upstream */
  }

  let answer: MemoRequiredAnswer = { required: false, source: 'none' };
  try {
    // 1) Community directory — covers exchanges that never set the on-chain
    //    flag (empirically including Coinbase).
    const dir = await fetchWithTimeout(`https://api.stellar.expert/explorer/directory/${address}`);
    if (dir.ok) {
      const entry = await dir.json();
      if (Array.isArray(entry?.tags) && entry.tags.includes('memo-required')) {
        answer = { required: true, name: entry.name || undefined, source: 'directory' };
      }
    }

    // 2) SEP-29 on-chain flag, for accounts the directory doesn't know.
    if (!answer.required) {
      const acc = await fetchWithTimeout(`https://horizon.stellar.org/accounts/${address}`);
      if (acc.ok) {
        const data = await acc.json();
        if (data?.data && 'config.memo_required' in data.data) {
          answer = { required: true, source: 'sep29' };
        }
      }
    }

    try {
      await redis.set(cacheKey, answer, { ex: CACHE_TTL_SECONDS });
    } catch {
      /* cache write non-fatal */
    }
    return NextResponse.json(answer);
  } catch (error) {
    logger.error('[memo-required] upstream error:', error);
    // Fail open: the client seed list + the SDK's submit-time check remain.
    return NextResponse.json({ required: false, degraded: true });
  }
});

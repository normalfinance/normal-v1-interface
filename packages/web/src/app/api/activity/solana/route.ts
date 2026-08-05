import type { NextRequest } from 'next/server';
import type { Activity } from '@/types/activity';

import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';
import { logger, getCryptoIconUrl } from '@normalfinance/utils';

// ---------------------------------------------------------------------------
// GET /api/activity/solana?address=…
// Native SOL send/receive history via Helius parsed transactions (key stays
// server-side), normalized to the shared Activity shape and cached briefly.
// ---------------------------------------------------------------------------

// Helius' parsed-transaction endpoint costs ~100 credits per call, so the
// cache — not the client — is what bounds our spend: the ceiling is per
// address, whatever number of tabs, devices or anonymous callers ask for it.
// A 30s TTL matched the client's dedupe window exactly, so almost every
// revalidation missed. 5 minutes is well clear of it.
const CACHE_TTL_SECONDS = 300;
// After a send the user must see their transaction immediately, so an explicit
// refresh may skip the cached copy — but no faster than the old TTL, keeping
// the worst case for this public route exactly where it already was.
const REFRESH_FLOOR_SECONDS = 30;
const SOL_ICON = getCryptoIconUrl('SOL');

interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number; // lamports
}

interface HeliusTx {
  signature: string;
  timestamp: number; // seconds
  transactionError: unknown | null;
  nativeTransfers?: HeliusNativeTransfer[];
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
  }

  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: true, items: [] });
  }

  const cacheKey = `activity:sol:${address}`;
  const floorKey = `activity:sol:floor:${address}`;
  const wantsFresh = request.nextUrl.searchParams.get('refresh') === '1';

  try {
    // A refresh request skips the cached copy, unless this address was already
    // refreshed within the floor window — that guard is what stops the public
    // `?refresh=1` path from becoming a way to burn our Helius quota.
    const withinFloor = wantsFresh ? await redis.get(floorKey) : null;
    if (!wantsFresh || withinFloor) {
      const cached = await redis.get<Activity[]>(cacheKey);
      if (cached) return NextResponse.json({ success: true, items: cached });
    }
  } catch {
    /* cache unavailable — fall through to the upstream fetch */
  }

  try {
    const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=25`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Helius error (${res.status})` }, { status: 502 });
    }
    const txs: HeliusTx[] = await res.json();

    const items: Activity[] = [];
    for (const tx of Array.isArray(txs) ? txs : []) {
      if (tx.transactionError) continue;
      const transfers = tx.nativeTransfers ?? [];
      // Net lamports moved to/from the user across this tx's native transfers
      let net = 0;
      let counterparty = '';
      for (const tr of transfers) {
        if (tr.toUserAccount === address) {
          net += tr.amount;
          counterparty = counterparty || tr.fromUserAccount;
        }
        if (tr.fromUserAccount === address) {
          net -= tr.amount;
          counterparty = counterparty || tr.toUserAccount;
        }
      }
      if (net === 0) continue; // no net SOL movement for this address (e.g. fee-only)

      const isReceive = net > 0;
      items.push({
        id: `sol:${tx.signature}`,
        timestamp: tx.timestamp * 1000,
        type: isReceive ? 'Receive' : 'Sent',
        address: counterparty || address,
        txHash: tx.signature,
        confirmed: true,
        token: { address: '__sol__', symbol: 'SOL', iconUrl: SOL_ICON, amount: Math.abs(net) / 1e9 },
      });
    }

    try {
      await redis.set(cacheKey, items, { ex: CACHE_TTL_SECONDS });
      if (wantsFresh) await redis.set(floorKey, 1, { ex: REFRESH_FLOOR_SECONDS });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ success: true, items });
  } catch (error) {
    logger.error('[activity/solana] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch activity' }, { status: 502 });
  }
}

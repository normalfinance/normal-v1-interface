import type { NextRequest } from 'next/server';
import type { Activity } from '@/types/activity';

import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';
import { Horizon } from '@stellar/stellar-sdk';
import { logger, getCryptoIconUrl, getStellarConfigForNetwork } from '@normalfinance/utils';

// ---------------------------------------------------------------------------
// GET /api/activity/stellar?address=…[&refresh=1]
// XLM + USDC payment history from Horizon, normalized to the shared Activity
// shape and cached. Previously called straight from the browser, which meant
// no shared cache, no timeout, and one request per tab — see docs/audit/
// 33-xlm-btc-plan.md.
// ---------------------------------------------------------------------------

// Horizon is free public infrastructure, so cost isn't what drives this TTL —
// deduplicating tabs/devices and bounding our own request rate is. 60s keeps
// the feed feeling live; a just-sent payment arrives via `?refresh=1` anyway.
const CACHE_TTL_SECONDS = 60;
const REFRESH_FLOOR_SECONDS = 30;
// Bounds the call our UI waits on. Browser-side there was no timeout at all,
// which is what made the shared loading skeleton unsafe to build (#37).
const HORIZON_TIMEOUT_MS = 8_000;
const PAYMENT_LIMIT = 100;

// Our own fee collection must never render as user activity.
const FEES_WALLET = 'GCVCVOJMNDX7DBYEN3YAJ2VWIHT4ZDUNSUFIRLHRQBKS7PXSTDRB4MWE';

const STELLAR_ADDRESS_RE = /^[GC][A-Z2-7]{55}$/;

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address || !STELLAR_ADDRESS_RE.test(address)) {
    return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
  }

  const cacheKey = `activity:xlm:${address}`;
  const floorKey = `activity:xlm:floor:${address}`;
  const wantsFresh = request.nextUrl.searchParams.get('refresh') === '1';

  try {
    // A refresh skips the cached copy unless this address was refreshed within
    // the floor window — the guard that keeps this public route from being
    // used to hammer Horizon through us.
    const withinFloor = wantsFresh ? await redis.get(floorKey) : null;
    if (!wantsFresh || withinFloor) {
      const cached = await redis.get<Activity[]>(cacheKey);
      if (cached) return NextResponse.json({ success: true, items: cached });
    }
  } catch {
    /* cache unavailable — fall through to Horizon */
  }

  try {
    const network = (process.env.NEXT_PUBLIC_NETWORK ?? 'mainnet').toLowerCase();
    const config = getStellarConfigForNetwork(network as 'mainnet' | 'testnet');

    const server = new Horizon.Server(config.HORIZON_URL, {
      allowHttp: config.HORIZON_URL.startsWith('http://'),
    });

    const payments = await Promise.race([
      server.payments().forAccount(address).order('desc').limit(PAYMENT_LIMIT).call(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('horizon timeout')), HORIZON_TIMEOUT_MS)
      ),
    ]);

    const items: Activity[] = [];

    for (const record of payments.records) {
      if (record.type !== 'payment') continue;
      const p = record as Horizon.ServerApi.PaymentOperationRecord;

      // XLM and canonical USDC only — other assets aren't surfaced in the feed.
      const isNative = p.asset_type === 'native';
      const isUsdc = p.asset_code === 'USDC' && p.asset_issuer === config.USDC_ISSUER;
      if (!isNative && !isUsdc) continue;
      if (p.to === FEES_WALLET) continue;

      const symbol = isNative ? 'XLM' : 'USDC';
      const isReceive = p.to === address;

      items.push({
        id: `horizon:${p.id}`,
        timestamp: Date.parse(p.created_at),
        type: isReceive ? 'Receive' : 'Sent',
        address: isReceive ? p.from : p.to,
        txHash: (p as unknown as { transaction_hash?: string }).transaction_hash ?? null,
        confirmed: true,
        token: {
          address: isNative ? 'native' : (p.asset_code ?? 'USDC'),
          symbol,
          iconUrl: getCryptoIconUrl(symbol),
          amount: parseFloat(p.amount),
        },
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
    logger.error('[activity/stellar] error:', error);
    // Serve a stale copy rather than an empty feed when Horizon is down or slow.
    try {
      const stale = await redis.get<Activity[]>(cacheKey);
      if (stale) return NextResponse.json({ success: true, items: stale, stale: true });
    } catch {
      /* ignore */
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch activity' }, { status: 502 });
  }
}

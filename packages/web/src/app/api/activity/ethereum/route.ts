import type { NextRequest } from 'next/server';
import type { Activity } from '@/types/activity';

import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';
import { logger, getCryptoIconUrl } from '@normalfinance/utils';

// ---------------------------------------------------------------------------
// GET /api/activity/ethereum?address=0x…
// Native ETH send/receive history via Etherscan (key stays server-side),
// normalized to the shared Activity shape and cached briefly so all callers
// share one upstream request.
// ---------------------------------------------------------------------------

// Two Etherscan calls per miss (normal + internal txs), so the cache is what
// bounds our rate-limit headroom: the ceiling is per address, however many
// tabs or anonymous callers ask. A 30s TTL matched the client's dedupe window
// exactly, so almost every revalidation missed.
const CACHE_TTL_SECONDS = 300;
// An explicit post-send refresh may skip the cached copy, but no faster than
// the old TTL — the worst case for this public route stays where it was.
const REFRESH_FLOOR_SECONDS = 30;
const ETH_ICON = getCryptoIconUrl('ETH');

interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string; // wei
  timeStamp: string; // seconds
  isError: string; // "0" ok, "1" failed
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.toLowerCase();
  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: true, items: [] });
  }

  const cacheKey = `activity:eth:${address}`;
  const floorKey = `activity:eth:floor:${address}`;
  const wantsFresh = request.nextUrl.searchParams.get('refresh') === '1';

  try {
    // A refresh skips the cached copy unless this address was already
    // refreshed within the floor window — the guard that keeps the public
    // `?refresh=1` path from being used to burn our Etherscan quota.
    const withinFloor = wantsFresh ? await redis.get(floorKey) : null;
    if (!wantsFresh || withinFloor) {
      const cached = await redis.get<Activity[]>(cacheKey);
      if (cached) return NextResponse.json({ success: true, items: cached });
    }
  } catch {
    /* cache unavailable — fall through to the upstream fetch */
  }

  const base = `https://api.etherscan.io/v2/api?chainid=1&module=account&address=${address}&startblock=0&endblock=99999999&page=1&offset=25&sort=desc&apikey=${apiKey}`;

  try {
    // Normal txs (wallet→wallet) AND internal txs (contract-initiated, e.g.
    // exchange/onramp/bridge deliveries). Onramps usually arrive as internal,
    // so querying only txlist misses them entirely.
    const [normalRes, internalRes] = await Promise.all([
      fetch(`${base}&action=txlist`, { cache: 'no-store' }),
      fetch(`${base}&action=txlistinternal`, { cache: 'no-store' }),
    ]);

    const normalData = normalRes.ok ? await normalRes.json() : { result: [] };
    const internalData = internalRes.ok ? await internalRes.json() : { result: [] };
    const normalTxs: EtherscanTx[] = Array.isArray(normalData?.result) ? normalData.result : [];
    const internalTxs: EtherscanTx[] = Array.isArray(internalData?.result)
      ? internalData.result
      : [];

    const toActivity = (tx: EtherscanTx, idSuffix: string): Activity => {
      const isReceive = tx.to?.toLowerCase() === address;
      const amount = Number(BigInt(tx.value)) / 1e18;
      return {
        id: `eth:${tx.hash}${idSuffix}`,
        timestamp: Number(tx.timeStamp) * 1000,
        type: isReceive ? 'Receive' : 'Sent',
        address: isReceive ? tx.from : tx.to,
        txHash: tx.hash,
        confirmed: true,
        token: { address: '__eth__', symbol: 'ETH', iconUrl: ETH_ICON, amount },
      };
    };

    const items: Activity[] = [
      ...normalTxs
        .filter((tx) => tx.isError === '0' && tx.value !== '0')
        .map((tx) => toActivity(tx, '')),
      ...internalTxs
        .filter((tx) => tx.isError === '0' && tx.value !== '0')
        .map((tx, i) => toActivity(tx, `:i${i}`)),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 25);

    try {
      await redis.set(cacheKey, items, { ex: CACHE_TTL_SECONDS });
      if (wantsFresh) await redis.set(floorKey, 1, { ex: REFRESH_FLOOR_SECONDS });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ success: true, items });
  } catch (error) {
    logger.error('[activity/ethereum] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' },
      { status: 502 }
    );
  }
}

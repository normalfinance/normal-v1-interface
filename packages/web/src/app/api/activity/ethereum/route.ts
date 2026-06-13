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

const CACHE_TTL_SECONDS = 30;
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
  try {
    const cached = await redis.get<Activity[]>(cacheKey);
    if (cached) return NextResponse.json({ success: true, items: cached });
  } catch {
    /* fall through */
  }

  try {
    const url =
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist` +
      `&address=${address}&startblock=0&endblock=99999999&page=1&offset=25&sort=desc&apikey=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Etherscan error (${res.status})` }, { status: 502 });
    }
    const data = await res.json();
    const txs: EtherscanTx[] = Array.isArray(data?.result) ? data.result : [];

    const items: Activity[] = txs
      // Only genuine value transfers (skip 0-value contract calls), successful only
      .filter((tx) => tx.isError === '0' && tx.value !== '0')
      .map((tx): Activity => {
        const isReceive = tx.to?.toLowerCase() === address;
        const amount = Number(BigInt(tx.value)) / 1e18;
        return {
          id: `eth:${tx.hash}`,
          timestamp: Number(tx.timeStamp) * 1000,
          type: isReceive ? 'Receive' : 'Sent',
          address: isReceive ? tx.from : tx.to,
          txHash: tx.hash,
          confirmed: true,
          token: { address: '__eth__', symbol: 'ETH', iconUrl: ETH_ICON, amount },
        };
      });

    try {
      await redis.set(cacheKey, items, { ex: CACHE_TTL_SECONDS });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ success: true, items });
  } catch (error) {
    logger.error('[activity/ethereum] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch activity' }, { status: 502 });
  }
}

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
    const internalTxs: EtherscanTx[] = Array.isArray(internalData?.result) ? internalData.result : [];

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
      ...normalTxs.filter((tx) => tx.isError === '0' && tx.value !== '0').map((tx) => toActivity(tx, '')),
      ...internalTxs.filter((tx) => tx.isError === '0' && tx.value !== '0').map((tx, i) => toActivity(tx, `:i${i}`)),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 25);

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

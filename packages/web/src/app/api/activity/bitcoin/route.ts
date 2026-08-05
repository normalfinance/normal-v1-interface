import type { NextRequest } from 'next/server';
import type { Activity } from '@/types/activity';

import { NextResponse } from 'next/server';
import { redis } from '@/server/rateLimiter';
import { cdn, logger } from '@normalfinance/utils';

// ---------------------------------------------------------------------------
// GET /api/activity/bitcoin?address=…[&refresh=1]
// BTC history from mempool.space, normalized to the shared Activity shape and
// cached. Previously called straight from the browser — see docs/audit/
// 33-xlm-btc-plan.md.
// ---------------------------------------------------------------------------

// Shorter than the SOL/ETH TTL on purpose: this feed carries *pending*
// transactions (confirmed: false), so a long cache would hide an incoming
// payment. Consistency with the other routes would be the wrong call here.
const CACHE_TTL_SECONDS = 45;
const REFRESH_FLOOR_SECONDS = 30;
const MEMPOOL_TIMEOUT_MS = 8_000;

// Reject obvious junk before spending an upstream call. Deliberately broad —
// legacy, P2SH and bech32(m) — since mempool.space is the real validator.
const BTC_ADDRESS_RE = /^(bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;

interface MempoolVin {
  prevout?: { scriptpubkey_address?: string };
}
interface MempoolVout {
  scriptpubkey_address?: string;
  value: number;
}
interface MempoolTx {
  txid: string;
  vin: MempoolVin[];
  vout: MempoolVout[];
  status?: { confirmed?: boolean; block_time?: number };
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address || !BTC_ADDRESS_RE.test(address)) {
    return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
  }

  const cacheKey = `activity:btc:${address}`;
  const floorKey = `activity:btc:floor:${address}`;
  const wantsFresh = request.nextUrl.searchParams.get('refresh') === '1';

  try {
    const withinFloor = wantsFresh ? await redis.get(floorKey) : null;
    if (!wantsFresh || withinFloor) {
      const cached = await redis.get<Activity[]>(cacheKey);
      if (cached) return NextResponse.json({ success: true, items: cached });
    }
  } catch {
    /* cache unavailable — fall through to mempool.space */
  }

  try {
    // /txs returns recent transactions but can drop older unconfirmed ones as
    // new confirmed txs arrive; /txs/mempool always lists every current
    // unconfirmed tx, so it stays the authority on pending status.
    const [txsRes, mempoolRes] = await Promise.all([
      fetch(`https://mempool.space/api/address/${address}/txs`, {
        signal: AbortSignal.timeout(MEMPOOL_TIMEOUT_MS),
        cache: 'no-store',
      }),
      fetch(`https://mempool.space/api/address/${address}/txs/mempool`, {
        signal: AbortSignal.timeout(MEMPOOL_TIMEOUT_MS),
        cache: 'no-store',
      }),
    ]);

    if (!txsRes.ok) {
      return NextResponse.json(
        { success: false, error: `mempool.space error (${txsRes.status})` },
        { status: 502 }
      );
    }

    const txs: MempoolTx[] = await txsRes.json();
    const mempoolTxs: MempoolTx[] = mempoolRes.ok ? await mempoolRes.json() : [];

    const mempoolIds = new Set(mempoolTxs.map((t) => t.txid));

    const txMap = new Map<string, MempoolTx>();
    for (const tx of txs) txMap.set(tx.txid, tx);
    for (const tx of mempoolTxs) if (!txMap.has(tx.txid)) txMap.set(tx.txid, tx);

    const btcIcon = cdn('tokens/bitcoin.webp');
    const items: Activity[] = [];

    for (const tx of txMap.values()) {
      const isConfirmed = mempoolIds.has(tx.txid) ? false : (tx.status?.confirmed ?? false);
      const timestamp = isConfirmed ? (tx.status?.block_time ?? 0) * 1000 : Date.now();

      const userInputs = tx.vin.filter((v) => v.prevout?.scriptpubkey_address === address);
      const nonUserOutputs = tx.vout.filter((v) => v.scriptpubkey_address !== address);
      const userOutputs = tx.vout.filter((v) => v.scriptpubkey_address === address);

      const isFromUser = userInputs.length > 0;
      const sentToOthers = nonUserOutputs.reduce((s, v) => s + v.value, 0);
      const receivedByUser = userOutputs.reduce((s, v) => s + v.value, 0);

      if (isFromUser && sentToOthers > 0) {
        items.push({
          id: `btc:${tx.txid}`,
          timestamp,
          type: 'Sent',
          address: nonUserOutputs[0]?.scriptpubkey_address ?? tx.txid,
          txHash: tx.txid,
          confirmed: isConfirmed,
          token: { address: '__btc__', symbol: 'BTC', iconUrl: btcIcon, amount: sentToOthers / 1e8 },
        });
      } else if (receivedByUser > 0) {
        const senderAddress = isFromUser
          ? address
          : (tx.vin[0]?.prevout?.scriptpubkey_address ?? tx.txid);
        items.push({
          id: `btc:${tx.txid}`,
          timestamp,
          type: 'Receive',
          address: senderAddress,
          txHash: tx.txid,
          confirmed: isConfirmed,
          token: {
            address: '__btc__',
            symbol: 'BTC',
            iconUrl: btcIcon,
            amount: receivedByUser / 1e8,
          },
        });
      }
    }

    try {
      await redis.set(cacheKey, items, { ex: CACHE_TTL_SECONDS });
      if (wantsFresh) await redis.set(floorKey, 1, { ex: REFRESH_FLOOR_SECONDS });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ success: true, items });
  } catch (error) {
    logger.error('[activity/bitcoin] error:', error);
    try {
      const stale = await redis.get<Activity[]>(cacheKey);
      if (stale) return NextResponse.json({ success: true, items: stale, stale: true });
    } catch {
      /* ignore */
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch activity' }, { status: 502 });
  }
}

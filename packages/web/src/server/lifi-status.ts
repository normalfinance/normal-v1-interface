import { redis } from '@/server/rateLimiter';
import { LIFI_ASSETS } from '@/server/lifi-quote';

// ---------------------------------------------------------------------------
// LI.FI bridge status for one recorded swap — shared by the activity feed
// (/api/lifi/statuses) and the push-notify cron. One implementation, one
// Redis cache: DONE/FAILED/REFUNDED cache a day, PENDING/NOTFOUND 30 s.
//
// NOTFOUND = the source tx does not exist on-chain (yet). The CALLER combines
// it with the swap's age: fresh = just submitted, old = never started.
// ---------------------------------------------------------------------------

export type LifiStatus = 'DONE' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'NOTFOUND';

/** LI.FI chain id for one of OUR asset symbols (BTC/ETH/SOL/USDC_BASE), from the quote map. */
export function lifiChainIdForSymbol(symbol: string): number | undefined {
  return LIFI_ASSETS[symbol]?.chainId;
}

/** Symbol-keyed entry point used by the activity feed. */
export async function lookupLifiStatus(
  txHash: string,
  fromSymbol: string,
  toSymbol: string,
  timeoutMs = 15_000
): Promise<LifiStatus> {
  return lookupLifiStatusByChainIds(
    txHash,
    lifiChainIdForSymbol(fromSymbol),
    lifiChainIdForSymbol(toSymbol),
    timeoutMs
  );
}

/** Chain-id entry point — the CCTP pivot (Base 8453 → target) has no symbol pair. */
export async function lookupLifiStatusByChainIds(
  txHash: string,
  fromChain: number | undefined,
  toChain: number | undefined,
  timeoutMs = 15_000
): Promise<LifiStatus> {
  const cacheKey = `lifi:status:${txHash}`;
  try {
    const cached = await redis.get<LifiStatus>(cacheKey);
    if (cached) return cached;
  } catch {
    /* cache miss on error */
  }

  const params = new URLSearchParams({ txHash });
  if (fromChain) params.set('fromChain', String(fromChain));
  if (toChain) params.set('toChain', String(toChain));

  const headers: Record<string, string> = {};
  if (process.env.LIFI_API_KEY) headers['x-lifi-api-key'] = process.env.LIFI_API_KEY;

  let status: LifiStatus = 'PENDING';
  try {
    const res = await fetch(`https://li.quest/v1/status?${params.toString()}`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json().catch(() => null);
    const s = data?.status as string | undefined;
    const sub = String(data?.substatus ?? '').toUpperCase();
    const msg = String(data?.message ?? '').toLowerCase();
    if (s === 'DONE') {
      // LI.FI marks a refund as DONE+REFUNDED (and partials as PARTIAL) — the
      // bridge "finished" but did not deliver the destination asset.
      status = sub === 'REFUNDED' || sub === 'PARTIAL' ? 'REFUNDED' : 'DONE';
    } else if (s === 'FAILED' || s === 'INVALID') status = 'FAILED';
    else if (msg.includes('not found')) status = 'NOTFOUND';
    else status = 'PENDING';
  } catch {
    status = 'PENDING';
  }

  try {
    const terminal = status === 'DONE' || status === 'FAILED' || status === 'REFUNDED';
    await redis.set(cacheKey, status, { ex: terminal ? 86_400 : 30 });
  } catch {
    /* ignore */
  }
  return status;
}

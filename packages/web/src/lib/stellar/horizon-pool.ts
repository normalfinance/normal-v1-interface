// ---------------------------------------------------------------------------
// Pooled Stellar balance read — try each Horizon until one ANSWERS.
//
// 2026-08-28: horizon.stellar.org became unreachable from a developer machine
// (DNS resolved, TCP never connected) and, as the aggregate's only URL, that
// single dead host blanked XLM/USDC across the whole app while BTC/ETH/SOL —
// which already had Wave 4 fallback pools — kept loading. This closes the
// same single-provider gap for the Stellar leg.
//
// The one rule that matters: a 404 is an ANSWER ("this account is unfunded"),
// not an outage — it must return zeros immediately, never fail over. Failing
// over on 404 would re-ask a question that has already been answered and make
// every unfunded account cost a round trip to every endpoint in the pool.
// ---------------------------------------------------------------------------

export interface StellarBalanceRead {
  xlm: number;
  usdc: number;
  /** Which endpoint answered — for the server log, so an outage of the
   *  primary is visible instead of silently absorbed. */
  servedBy: string;
}

export interface PoolOptions {
  timeoutMs?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
}

export async function fetchStellarBalancesFromPool(
  urls: readonly string[],
  address: string,
  usdcIssuer: string,
  opts: PoolOptions = {}
): Promise<StellarBalanceRead> {
  const { timeoutMs = 5000, fetchImpl = fetch } = opts;
  const pool = [...new Set(urls.map((u) => u.replace(/\/+$/, '')).filter(Boolean))];
  if (pool.length === 0) throw new Error('no horizon endpoints configured');

  let lastErr: unknown;
  for (const base of pool) {
    try {
      const res = await fetchImpl(`${base}/accounts/${address}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
      // An unfunded account is a definitive answer from the ledger — zeros,
      // and no other endpoint gets asked.
      if (res.status === 404) return { xlm: 0, usdc: 0, servedBy: base };
      if (!res.ok) {
        // 429/5xx — this endpoint is unhappy; the next one may not be.
        lastErr = new Error(`stellar ${res.status} from ${base}`);
        continue;
      }
      const d = await res.json();
      const balances: any[] = d.balances ?? [];
      const xlm = parseFloat(balances.find((b) => b.asset_type === 'native')?.balance ?? '0');
      const usdc = parseFloat(
        balances.find((b) => b.asset_code === 'USDC' && b.asset_issuer === usdcIssuer)?.balance ??
          '0'
      );
      return { xlm, usdc, servedBy: base };
    } catch (err) {
      // Connection refused, DNS failure, timeout — try the next endpoint.
      lastErr = err;
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Try-each-in-order RPC pool for balance reads. The Stellar reads have had a
// failover pool since the Horizon outage (lib/stellar/horizon-pool.ts); ETH and
// SOL did not, so a single flaky provider blanked those rows.
//
// Live evidence (2026-09-02): Helius returned HTTP 500 "Internal server error"
// on 2 of 5 consecutive getBalance calls while getHealth/getSlot were fine. A
// user whose SOL had just arrived saw the pre-swap balance, because a failed
// read is intentionally patched from the last known value rather than shown as
// zero (never invent a $0). One flaky provider must not be able to do that.
// ---------------------------------------------------------------------------

export interface PoolResult<T> {
  value: T;
  /** Which URL actually answered — callers log a silent failover. */
  servedBy: string;
}

export async function rpcFromPool<T>(
  urls: string[],
  call: (url: string) => Promise<T>
): Promise<PoolResult<T>> {
  const candidates = urls.filter(Boolean);
  if (candidates.length === 0) throw new Error('rpcFromPool: no URLs configured');

  let lastError: unknown;
  for (const url of candidates) {
    try {
      return { value: await call(url), servedBy: url };
    } catch (e) {
      lastError = e;
    }
  }
  // Every endpoint failed: this is a real outage, not a hiccup. Throwing keeps
  // the caller's "unknown balance" path (stale value kept) rather than a zero.
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

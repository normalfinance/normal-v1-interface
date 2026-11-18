// ---------------------------------------------------------------------------
// "Has the ledger got it yet?" — asked directly, instead of inferred.
//
// After a Soroswap swap the app refreshed balances and tried to work out
// whether the answer was post-swap by seeing if a number had moved. That is
// guesswork on two fronts at once: the shared aggregate can serve a cached
// copy, AND Horizon can legitimately not have ingested the transaction yet.
// When the balance looked stale there was no way to tell which of the two was
// responsible.
//
// The swap hands us a transaction hash, so there is a definitive question
// available: is this transaction visible on Horizon? Ask that FIRST, and the
// balance read afterwards is being made at a moment when the ledger provably
// contains the swap. It also costs nothing in the normal case — Horizon has
// the transaction almost immediately, so this returns on the first poll.
//
// Deliberately a direct Horizon read: no server cache, no bypass floor, no
// SWR. The layers that made the old signal unreliable are not in the way.
// ---------------------------------------------------------------------------

export interface AwaitTxOptions {
  /** Overall budget. Well under the swap modal's own Done cap. */
  timeoutMs?: number;
  /** Gap between polls. */
  intervalMs?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export const TX_VISIBLE_TIMEOUT_MS = 8_000;
export const TX_VISIBLE_INTERVAL_MS = 700;

/** Where the ledger put it: the ledger number and when that ledger closed. */
export interface TxRecord {
  ledger: number | null;
  closedAt: string | null;
}

/**
 * Resolves `true` once Horizon reports the transaction, `false` if the budget
 * runs out. Never throws and never blocks the caller indefinitely: a swap that
 * has already succeeded must not be held up by our own bookkeeping, so an
 * unreachable Horizon simply gives up and lets the balance refresh proceed.
 */
export async function awaitTxVisible(
  horizonUrl: string,
  txHash: string,
  opts: AwaitTxOptions = {}
): Promise<boolean> {
  return (await awaitTxRecord(horizonUrl, txHash, opts)) !== null;
}

/**
 * The same wait, keeping what Horizon said: the ledger the transaction is in
 * and when it closed, for the step that reports it (fields null when the
 * answer lacks them). null when the budget runs out.
 */
export async function awaitTxRecord(
  horizonUrl: string,
  txHash: string,
  opts: AwaitTxOptions = {}
): Promise<TxRecord | null> {
  const {
    timeoutMs = TX_VISIBLE_TIMEOUT_MS,
    intervalMs = TX_VISIBLE_INTERVAL_MS,
    fetchImpl = fetch,
    sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
    now = () => Date.now(),
  } = opts;

  if (!horizonUrl || !txHash) return null;
  const startedAt = now();
  const base = horizonUrl.replace(/\/+$/, '');

  for (;;) {
    try {
      const res = await fetchImpl(`${base}/transactions/${txHash}`, { cache: 'no-store' });
      // 404 is the expected "not ingested yet" answer, not an error.
      if (res.ok) {
        let body: { ledger?: unknown; created_at?: unknown } | null = null;
        try {
          body = typeof res.json === 'function' ? await res.json() : null;
        } catch {
          /* visible is what matters; the details are a bonus */
        }
        const ledger = Number(body?.ledger);
        return {
          ledger: Number.isInteger(ledger) && ledger > 0 ? ledger : null,
          closedAt: typeof body?.created_at === 'string' ? body.created_at : null,
        };
      }
    } catch {
      /* transient — Horizon blip or offline; keep trying within the budget */
    }
    // Check AFTER the attempt so a zero budget still gets one honest look.
    if (now() - startedAt + intervalMs >= timeoutMs) return null;
    await sleep(intervalMs);
  }
}

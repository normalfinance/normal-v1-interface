const DUNE_API_KEY = process.env.DUNE_API_KEY!;
const DUNE_NAMESPACE = process.env.DUNE_NAMESPACE ?? 'normalfinance';
const BASE_URL = 'https://api.dune.com/api/v1/uploads';

// ---------------------------------------------------------------------------
// 429-aware retry (doc 121). One sync makes ~24 Dune API calls and the free
// plan rate-limits per minute: the first tables spend the window and the last
// ones get "429 Too many requests" — which is exactly how the v2 tables stayed
// empty while the v1 tables uploaded fine. A blocked call waits for the window
// to refill and tries again — bounded per call AND per run so the cron stays
// inside its maxDuration.
//
// ONLY 429 is retried. A 429 is rejected at the gate, so retrying can never
// double-insert; a 5xx MAY have committed server-side, and retrying an insert
// after a hidden commit would duplicate rows (deadly for the append-only
// holdings table). A 5xx therefore still fails the step loudly.
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 4; // 1 try + up to 3 retries per call
const BACKOFF_MS = [5_000, 15_000, 30_000]; // wait after attempt 1, 2, 3
const RETRY_AFTER_CAP_MS = 60_000; // never trust a huge Retry-After header
const RUN_RETRY_BUDGET_MS = 120_000; // total retry sleep per sync run

let budgetLeftMs = RUN_RETRY_BUDGET_MS;

// Serverless instances stay warm between cron runs, so the sync route resets
// the shared budget at the start of each run.
export function resetDuneRetryBudget(): void {
  budgetLeftMs = RUN_RETRY_BUDGET_MS;
}

// Pure decision: how long to wait before retrying this response — or null to
// give up (non-429 status, attempts exhausted, or run budget exhausted).
export function duneRetryDelayMs(
  status: number,
  attempt: number, // 1-based
  retryAfterHeader: string | null,
  remainingBudgetMs: number
): number | null {
  if (status !== 429) return null;
  if (attempt >= MAX_ATTEMPTS) return null;
  const retryAfter = Number(retryAfterHeader);
  const delay =
    Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, RETRY_AFTER_CAP_MS)
      : (BACKOFF_MS[attempt - 1] ?? RETRY_AFTER_CAP_MS);
  return delay <= remainingBudgetMs ? delay : null;
}

async function duneFetch(url: string, init: RequestInit, label: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return;

    const body = await res.text();
    const delay = duneRetryDelayMs(
      res.status,
      attempt,
      res.headers.get('retry-after'),
      budgetLeftMs
    );
    if (delay === null) {
      throw new Error(`Dune ${label} failed: ${res.status} ${body}`);
    }
    budgetLeftMs -= delay;
    await new Promise((r) => setTimeout(r, delay));
  }
}

export async function duneInsert(tableName: string, rows: object[]): Promise<void> {
  if (!rows.length) return;

  const ndjson = rows.map((r) => JSON.stringify(r)).join('\n');

  await duneFetch(
    `${BASE_URL}/${DUNE_NAMESPACE}/${tableName}/insert`,
    {
      method: 'POST',
      headers: {
        'X-DUNE-API-KEY': DUNE_API_KEY,
        'Content-Type': 'application/x-ndjson',
      },
      body: ndjson,
    },
    `insert for ${tableName}`
  );
}

export async function duneClear(tableName: string): Promise<void> {
  await duneFetch(
    `${BASE_URL}/${DUNE_NAMESPACE}/${tableName}/clear`,
    {
      method: 'POST',
      headers: { 'X-DUNE-API-KEY': DUNE_API_KEY },
    },
    `clear for ${tableName}`
  );
}

import { createRequestGate } from './request-gate';

// ---------------------------------------------------------------------------
// Shared DeFindex rate-limit handling.
//
// A cold savings load fires ~5 upstream calls at once (vault info + APY, vault
// balance, the paginated events history, account position) and DeFindex's limit
// is per second — their 429 carries `retryAfter: 1`. Caching removed repeat
// load but not that burst, so the first request after a cold cache was being
// throttled every time.
//
// The policy lives here, once, rather than being copied into each route.
// See docs/audit/39-defindex-429-plan.md.
// ---------------------------------------------------------------------------

/** Their retryAfter is in seconds. Capped so a large value can't blow the
 *  request timeout — we honour their number, but bounded. */
const MAX_RETRY_DELAY_MS = 2_000;
const DEFAULT_RETRY_DELAY_MS = 1_000;

interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfterMs: number;
}

/**
 * DeFindex surfaces a 429 two different ways: the SDK throws an object with
 * `statusCode`, while our raw `fetch` calls throw an Error whose message
 * carries the status and body. Both are recognised here so callers don't have
 * to care which kind of call they made.
 */
export function inspectRateLimit(error: unknown): RateLimitInfo {
  const none: RateLimitInfo = { isRateLimited: false, retryAfterMs: 0 };
  if (!error || typeof error !== 'object') {
    // Raw fetch failures are thrown as Error with the status in the message.
    if (typeof error === 'string' && error.includes('429')) {
      return { isRateLimited: true, retryAfterMs: DEFAULT_RETRY_DELAY_MS };
    }
    return none;
  }

  const err = error as {
    statusCode?: number;
    status?: number;
    retryAfter?: number;
    message?: string;
  };
  const status = err.statusCode ?? err.status;
  const messageHas429 = typeof err.message === 'string' && err.message.includes('429');

  if (status !== 429 && !messageHas429) return none;

  const seconds = typeof err.retryAfter === 'number' ? err.retryAfter : null;
  const retryAfterMs = seconds != null ? seconds * 1000 : DEFAULT_RETRY_DELAY_MS;
  return { isRateLimited: true, retryAfterMs: Math.min(retryAfterMs, MAX_RETRY_DELAY_MS) };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Shared across every DeFindex call in this server process (doc 90 W3).
const defindexGate = createRequestGate({ concurrency: 2, minGapMs: 300 });

/**
 * Runs `fn`, and on a 429 waits the interval DeFindex asked for and tries
 * ONCE more.
 *
 * Deliberately strict:
 * - only 429s are retried — retrying other errors amplifies load during an
 *   outage, turning their bad minute into ours;
 * - exactly one retry, never a loop — a retry loop under rate limiting is how
 *   a throttle becomes an outage;
 * - the delay is their number, capped, so one slow call can't exhaust the
 *   request budget for the rest.
 */
export async function withRateLimitRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  // Doc 90 W3 (the long-standing 429 bursts): every DeFindex call now rides a
  // shared gate — bounded concurrency + spaced starts — so a cold savings
  // load queues politely instead of firing ~5 calls in one second. Retries
  // gained one attempt and JITTER, so parallel retries stop landing on the
  // same instant and re-tripping the limit.
  for (let attempt = 0; ; attempt++) {
    try {
      return await defindexGate.run(fn);
    } catch (error) {
      const { isRateLimited, retryAfterMs } = inspectRateLimit(error);
      if (!isRateLimited || attempt >= 2) throw error;
      const jitter = Math.floor(Math.random() * 400);
      console.warn(
        `[defindex] ${label} rate-limited (attempt ${attempt + 1}/3), retrying in ${retryAfterMs + jitter}ms`
      );
      await sleep(retryAfterMs + jitter);
    }
  }
}

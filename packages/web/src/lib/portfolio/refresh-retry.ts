// ---------------------------------------------------------------------------
// When is a post-action balance read actually finished?
//
// The portfolio route floors `refresh=1` to once per 5 seconds per user, to
// stop the bypass being leaned on to hammer the chain sources. Inside that
// window a "fresh" request is not made to wait — it is handed the 15-second
// response cache, which can be from BEFORE the swap. The client could not tell
// the two apart, so it inferred freshness from the data instead:
//
//   if (total(fresh) === before) { wait past the floor; read once more }
//
// "Did the number change?" is a proxy for "is this data fresh?", and the two
// come apart exactly when it matters. Live 2026-08-27 (Niko, two Stellar swaps
// back to back): swap 1's reads were floored and left the UI on the pre-swap-1
// figure. Swap 2 then compared against THAT, and its own floored response —
// carrying post-swap-1 data — was *different*, so the retry never ran. The
// balance settled on post-swap-1 and stayed there until a full page reload.
//
// The fix is to stop inferring: the route now says when it served a floored
// response, and the decision below uses that directly.
// ---------------------------------------------------------------------------

/** Just past the route's 5s floor, so the next read can actually be served. */
export const FLOOR_WAIT_MS = 5_600;

/** Total reads per action. Bounded: an unmoved balance after this defers to
 *  the 30s background poll rather than looping against the chain sources. */
export const MAX_REFRESH_ATTEMPTS = 3;

/** Never re-read faster than this, however small the server's hint. */
export const MIN_RETRY_WAIT_MS = 300;

/**
 * Total time the retry loop may spend, and why the number matters.
 *
 * The swap modal's Done is gated on this loop with its own 15s cap:
 *
 *   await Promise.race([refreshAggregate(), timeout(15_000)])
 *
 * If the loop can outlive that cap, Done appears while a read is still in
 * flight — the balance then lands a second or two AFTER the popup says the
 * swap is finished, which is the very thing this work is meant to stop.
 * Keeping the budget under the cap makes "Done" mean "the balance on screen
 * is the balance after this swap", by construction rather than by luck.
 */
export const REFRESH_BUDGET_MS = 12_000;

/** Is there room for another read plus the wait in front of it? */
export function canAffordAnotherRead(elapsedMs: number, delayMs: number): boolean {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(delayMs)) return false;
  // Allow for the read itself, not just the wait.
  return elapsedMs + delayMs + MIN_RETRY_WAIT_MS <= REFRESH_BUDGET_MS;
}

/**
 * How long to wait before reading again.
 *
 * A flat FLOOR_WAIT_MS assumes a whole floor window is left, which is only
 * true when WE just claimed it. For a floored response the server tells us
 * what is actually left, and using it is the difference between a ~0.5s pause
 * and a needless 5.6s one — the lag still visible at "Updating balances"
 * after the freshness fix (Niko, 2026-08-28).
 */
export function nextReadDelayMs(args: { floored: boolean; retryAfterMs?: number | null }): number {
  // Not floored: the read was real, so the floor is one we just set — the
  // whole window is ahead of us.
  if (!args.floored) return FLOOR_WAIT_MS;
  const hint = args.retryAfterMs;
  if (typeof hint !== 'number' || !Number.isFinite(hint) || hint <= 0) return FLOOR_WAIT_MS;
  // Clamp: a hint can never make us poll faster than MIN, nor wait longer
  // than a full window (a bad or stale hint must not strand the user).
  return Math.min(Math.max(hint, MIN_RETRY_WAIT_MS), FLOOR_WAIT_MS);
}

export function shouldRetryPortfolioRead(args: {
  /** The route served a cached copy despite `refresh=1`. */
  floored: boolean;
  /** The value we are waiting on moved. */
  changed: boolean;
  /** 1-based; the attempt that just completed. */
  attempt: number;
  maxAttempts?: number;
}): boolean {
  const max = args.maxAttempts ?? MAX_REFRESH_ATTEMPTS;
  if (args.attempt >= max) return false;
  // Floored means we never actually read anything new — whatever the numbers
  // say, this attempt proved nothing.
  if (args.floored) return true;
  // A genuinely fresh read that still shows the old value: the chain's own
  // read replicas can lag a moment behind the transaction.
  return !args.changed;
}

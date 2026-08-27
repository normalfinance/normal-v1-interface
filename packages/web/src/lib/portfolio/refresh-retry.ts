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

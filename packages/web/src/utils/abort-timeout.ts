// ---------------------------------------------------------------------------
// AbortSignal.timeout, with a fallback for Safari < 16.
//
// Safari only gained `AbortSignal.timeout()` in 16.0 (Sep 2022). On anything
// older — an un-updated iPhone, an older iPad — every fetch that passes
// `signal: AbortSignal.timeout(...)` does not "time out": it throws
// `TypeError: AbortSignal.timeout is not a function` SYNCHRONOUSLY, before
// the request is even sent. Thirteen client call sites used it directly, so
// on those devices the wallet lookup, gas reads, CCTP status polls and the
// MoneyGram client all died instantly — which surfaces as sections that
// simply never load (found investigating "coin assets weren't loading" on an
// iPhone, 2026-08-28).
//
// Dependency-free on purpose (same rule as utils/logger — small helpers must
// not drag barrels into jest or the bundle).
// ---------------------------------------------------------------------------

export function abortTimeout(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  // Fallback: a plain controller aborted by a timer. The timer keeps the
  // controller alive until it fires, which is exactly the lifetime we need;
  // there is nothing to clean up — an already-settled fetch ignores a late
  // abort.
  const controller = new AbortController();
  setTimeout(
    () => controller.abort(new DOMException(`signal timed out after ${ms}ms`, 'TimeoutError')),
    ms
  );
  return controller.signal;
}

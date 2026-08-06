'use client';

import type { ChainId } from '@/lib/chains/registry';

import { addPendingSend } from '@/lib/pending-sends';

// ---------------------------------------------------------------------------
// The one place that announces "money just moved" to the rest of the app.
//
// Listeners of `nf:activity-updated` refresh balances and the activity feed
// (with a server-cache bypass). Historically each flow dispatched the raw
// event itself and SENDS dispatched nothing — which is exactly the bug in
// docs/audit/48-send-visibility-plan.md: a successful send left every screen
// stale until caches expired.
//
// Send primitives call `announceTransaction` once, on broadcast success. It
//   1. records the pending send (visible in the feed immediately),
//   2. fires the event now — listeners refresh with their cache bypass,
//   3. fires it again at +8s and +45s, then NEVER again.
//
// The follow-ups exist because indexers lag broadcast: Horizon has a Stellar
// tx ~5s after submit (the immediate refresh can beat it), mempool.space
// lists a BTC tx within seconds, Etherscan can take minutes (its refresh is
// floored server-side anyway). Three bounded shots per user action — not a
// poller; a send pending for hours costs zero further requests.
//
// `detail.chain` means "a plain wallet send on this chain": listeners that
// know their chain refresh only that one feed, and listeners that a send
// cannot affect (savings, CCTP, the DB activity log) skip entirely.
// Detail-less dispatches (swaps, ramps, savings) keep refreshing everything,
// exactly as before this module existed.
// ---------------------------------------------------------------------------

export const ACTIVITY_UPDATED_EVENT = 'nf:activity-updated';

const FOLLOW_UP_DELAYS_MS = [8_000, 45_000];

export interface PendingSendInput {
  txHash: string;
  symbol: string;
  /** Display amount in coin units, e.g. "5" for 5 XLM. */
  amount: string;
  destination: string;
}

function dispatch(chain?: ChainId): void {
  window.dispatchEvent(new CustomEvent(ACTIVITY_UPDATED_EVENT, { detail: chain ? { chain } : undefined }));
}

export function announceTransaction(opts: { chain: ChainId; pendingSend?: PendingSendInput }): void {
  if (typeof window === 'undefined') return;

  if (opts.pendingSend) {
    addPendingSend({ ...opts.pendingSend, chain: opts.chain });
  }

  dispatch(opts.chain);
  for (const delay of FOLLOW_UP_DELAYS_MS) {
    setTimeout(() => dispatch(opts.chain), delay);
  }
}

/** The chain a scoped announcement was about, or undefined for the legacy
 *  "refresh everything" dispatches. Kept here so listeners never parse the
 *  event shape themselves. */
export function chainOfActivityEvent(e: Event): ChainId | undefined {
  return (e as CustomEvent<{ chain?: ChainId }>).detail?.chain;
}

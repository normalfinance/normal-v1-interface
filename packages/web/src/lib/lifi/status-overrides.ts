'use client';

// ---------------------------------------------------------------------------
// Session-local LI.FI status overrides (#62 follow-up, observed live
// 2026-08-12): the activity feed marks a cross-chain swap pending until
// /api/lifi/statuses says DONE — but that route caches PENDING for 30s, so a
// feed refresh fired the moment the bridge delivers gets served the stale
// cached answer and the row stays "pending" until a manual refresh.
//
// The tracker in THIS tab knows the truth first. It registers the terminal
// status here, and the feed prefers this override over the server answer.
// Other tabs/sessions converge within the cache's 30s TTL — this fixes the
// only case a human actually watches: the tab that ran the swap.
// ---------------------------------------------------------------------------

export type LifiTerminalStatus = 'DONE' | 'FAILED' | 'REFUNDED';

const overrides = new Map<string, LifiTerminalStatus>();

export function registerLifiStatusOverride(txHash: string, status: LifiTerminalStatus): void {
  overrides.set(txHash.toLowerCase(), status);
}

export function getLifiStatusOverride(txHash: string): LifiTerminalStatus | undefined {
  return overrides.get(txHash.toLowerCase());
}

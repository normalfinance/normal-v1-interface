'use client';

import { buildAuthHeaders } from '@/utils/http';

// ---------------------------------------------------------------------------
// Cached lookup of the user's Turnkey wallet (subOrgId + addresses).
// Used by the Stellar signing path to decide whether a wallet address is
// Turnkey-managed (passkey signing) or locally keyed (password signing).
// ---------------------------------------------------------------------------

export interface TurnkeyWalletInfo {
  subOrgId: string;
  /** Empty string while an import is in progress (sub-org without wallet) */
  walletId: string;
  bitcoinAddress: string | null;
  ethereumAddress: string | null;
  solanaAddress: string | null;
  stellarAddress: string | null;
}

const CACHE_TTL_MS = 60_000;

let cache: { value: TurnkeyWalletInfo | null; ts: number } | null = null;
// Caching the *result* alone isn't enough: nine call sites (signing paths,
// send adapters, the wizard) run on the same tick, all miss the still-empty
// cache and each fires its own request. Holding the in-flight promise makes
// concurrent callers await the first request instead of starting new ones.
let inFlight: Promise<TurnkeyWalletInfo | null> | null = null;

export function invalidateTurnkeyWalletInfo(): void {
  cache = null;
  // Drop any in-flight request too: it was started against the pre-import
  // state, so its answer is already stale for the caller that invalidated.
  inFlight = null;
}

export async function getTurnkeyWalletInfo(): Promise<TurnkeyWalletInfo | null> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.value;
  if (inFlight) return inFlight;

  const request = (async () => {
    try {
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/turnkey/wallet', { headers });
      if (!res.ok) return cache?.value ?? null;
      const data = await res.json();
      cache = { value: data.wallet ?? null, ts: Date.now() };
      return cache.value;
    } catch {
      return cache?.value ?? null;
    }
  })();

  inFlight = request;
  // Release the slot once settled — but only if this is still the current
  // request, since invalidate() during the fetch may already have cleared it.
  return request.finally(() => {
    if (inFlight === request) inFlight = null;
  });
}

/** True when the given Stellar address is signed by the user's Turnkey passkey. */
export async function isTurnkeyStellarAddress(address: string | null | undefined): Promise<boolean> {
  if (!address) return false;
  const info = await getTurnkeyWalletInfo();
  return !!info?.stellarAddress && info.stellarAddress === address;
}

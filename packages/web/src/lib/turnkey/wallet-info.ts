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
  stellarAddress: string | null;
}

const CACHE_TTL_MS = 60_000;

let cache: { value: TurnkeyWalletInfo | null; ts: number } | null = null;

export function invalidateTurnkeyWalletInfo(): void {
  cache = null;
}

export async function getTurnkeyWalletInfo(): Promise<TurnkeyWalletInfo | null> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.value;

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
}

/** True when the given Stellar address is signed by the user's Turnkey passkey. */
export async function isTurnkeyStellarAddress(address: string | null | undefined): Promise<boolean> {
  if (!address) return false;
  const info = await getTurnkeyWalletInfo();
  return !!info?.stellarAddress && info.stellarAddress === address;
}

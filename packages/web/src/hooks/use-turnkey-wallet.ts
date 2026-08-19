'use client';

import type { AddressField } from '@/lib/chains/registry';

import useSWR from 'swr';
import { buildAuthHeaders } from '@/utils/http';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

/**
 * Derived from the chain registry, so adding a chain there extends this shape
 * automatically. Prefer `getChainAddress(addresses, chainId)` over reading a
 * named field.
 */
export type TurnkeyAddresses = Record<AddressField, string | null>;

// ---------------------------------------------------------------------------
// The user's Turnkey wallet addresses, behind ONE shared SWR so every consumer
// dedupes onto a single /api/turnkey/wallet request (previously each hook
// instance fetched independently — a flood across views). Keyed by user so a
// logout/login can't bleed addresses between accounts.
// ---------------------------------------------------------------------------

// #75 follow-up: last-known addresses per user (localStorage,
// stale-while-revalidate). Turnkey addresses are PUBLIC and effectively
// append-only (lazy provisioning adds chains, never changes them), so a
// cached copy is safe to paint instantly — the drawer's address rows arrived
// seconds after the (cached) assets because this fetch only starts when the
// drawer opens and had no seed. Keyed by user id so accounts can't bleed.
const ADDR_CACHE_KEY = 'nf:turnkey-addresses:v1';

function readAddrCache(userId: string): TurnkeyAddresses | null | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(`${ADDR_CACHE_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as TurnkeyAddresses | null) : undefined;
  } catch {
    return undefined;
  }
}

function writeAddrCache(userId: string, addresses: TurnkeyAddresses | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${ADDR_CACHE_KEY}:${userId}`, JSON.stringify(addresses));
  } catch {
    /* storage full — non-fatal */
  }
}

export function useTurnkeyWallet(enabled = true) {
  const { user } = useSupabaseAuth();

  const { data, error, isLoading, mutate } = useSWR<TurnkeyAddresses | null>(
    enabled && user ? ['turnkey-wallet', user.id] : null,
    async () => {
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/turnkey/wallet', { headers });
      if (!res.ok) {
        // Carry the status so consumers can tell an auth failure apart from
        // "user has no wallet" — a 401 must never render as an empty account.
        const err = new Error(`turnkey wallet fetch failed: ${res.status}`) as Error & {
          status?: number;
        };
        err.status = res.status;
        throw err;
      }
      const d = await res.json();
      const wallet = (d.wallet ?? null) as TurnkeyAddresses | null;
      if (user) writeAddrCache(user.id, wallet);
      return wallet;
    },
    {
      fallbackData: user ? readAddrCache(user.id) : undefined,
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      keepPreviousData: true,
    }
  );

  return {
    addresses: data ?? null,
    loading: isLoading,
    // null = not checked yet (loading or errored); false = no wallet; true = has wallet.
    // On error SWR keeps the last successful data, so a transient failure
    // doesn't flip an already-known wallet back to "unknown".
    hasWallet: data === undefined ? null : !!data,
    // The session token was rejected (e.g. revoked by a logout elsewhere) —
    // the user must re-authenticate; their wallets are NOT gone.
    authFailed: (error as (Error & { status?: number }) | undefined)?.status === 401,
    refetch: () => mutate(),
  };
}

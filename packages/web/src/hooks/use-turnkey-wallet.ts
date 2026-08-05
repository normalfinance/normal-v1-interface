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
      return (d.wallet ?? null) as TurnkeyAddresses | null;
    },
    { revalidateOnFocus: false, dedupingInterval: 60_000, keepPreviousData: true }
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

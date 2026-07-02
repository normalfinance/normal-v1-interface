'use client';

import useSWR from 'swr';
import { buildAuthHeaders } from '@/utils/http';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

export interface TurnkeyAddresses {
  bitcoinAddress: string | null;
  ethereumAddress: string | null;
  solanaAddress: string | null;
  stellarAddress: string | null;
}

// ---------------------------------------------------------------------------
// The user's Turnkey wallet addresses, behind ONE shared SWR so every consumer
// dedupes onto a single /api/turnkey/wallet request (previously each hook
// instance fetched independently — a flood across views). Keyed by user so a
// logout/login can't bleed addresses between accounts.
// ---------------------------------------------------------------------------

export function useTurnkeyWallet(enabled = true) {
  const { user } = useSupabaseAuth();

  const { data, isLoading, mutate } = useSWR<TurnkeyAddresses | null>(
    enabled && user ? ['turnkey-wallet', user.id] : null,
    async () => {
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/turnkey/wallet', { headers });
      if (!res.ok) throw new Error('fetch failed');
      const d = await res.json();
      return (d.wallet ?? null) as TurnkeyAddresses | null;
    },
    { revalidateOnFocus: false, dedupingInterval: 60_000, keepPreviousData: true }
  );

  return {
    addresses: data ?? null,
    loading: isLoading,
    // null = not checked yet; false = no wallet; truthy object = has wallet
    hasWallet: data === undefined ? null : !!data,
    refetch: () => mutate(),
  };
}

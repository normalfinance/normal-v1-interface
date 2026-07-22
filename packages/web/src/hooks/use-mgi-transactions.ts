'use client';

import type { MgiDbTransaction } from '@/lib/mgi/statuses';

import useSWR from 'swr';
import { buildAuthHeaders } from '@/utils/http';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

// ---------------------------------------------------------------------------
// The user's MoneyGram transactions from OUR database — one shared SWR so the
// activity feed, pending banner, and detail modal all dedupe onto a single
// /api/mgi/transactions request. No SEP-10 involved: this must never trigger
// a passkey ceremony just to render history.
// ---------------------------------------------------------------------------

export function useMgiTransactions(enabled = true) {
  const { user } = useSupabaseAuth();

  const { data, mutate } = useSWR<MgiDbTransaction[]>(
    enabled && user ? ['mgi-db-transactions', user.id] : null,
    async () => {
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/mgi/transactions', { headers, credentials: 'include' });
      if (!res.ok) throw new Error(`mgi transactions fetch failed: ${res.status}`);
      const d = await res.json();
      return (d.transactions ?? []) as MgiDbTransaction[];
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 15_000,
      // Cheap poll of our own DB (indexed by user) so an in-flight deposit's
      // status reported from another view/device shows up on its own.
      refreshInterval: 60_000,
      keepPreviousData: true,
    }
  );

  return { transactions: data ?? [], mutate };
}

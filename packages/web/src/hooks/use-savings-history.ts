'use client';

import type { SavingsHistoryEvent } from '@/server/defindex-events';

import useSWR from 'swr';
import { useNetworkStore } from '@normalfinance/state';

// #53: the wallet's REAL deposit/withdraw history for the earnings chart.
// Standard display-source pattern: SWR deduped, localStorage seed for instant
// paint, errors keep the last curve (a failed fetch must never flatten a
// chart to $0).

const LS_KEY = 'nf:savings-history:v1';

function readCache(key: string): SavingsHistoryEvent[] | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(`${LS_KEY}:${key}`);
    return raw ? (JSON.parse(raw) as SavingsHistoryEvent[]) : undefined;
  } catch {
    return undefined;
  }
}

export function useSavingsHistory(address: string | null | undefined) {
  const network = useNetworkStore((s) => s.network);
  const key = address ? `${address}:${network}` : null;
  const { data, error, isLoading, isValidating } = useSWR<SavingsHistoryEvent[]>(
    key ? ['savings-history', address, network] : null,
    async () => {
      const res = await fetch(`/api/savings/earnings-history?user=${address}&network=${network}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? `history ${res.status}`);
      const events = json.events as SavingsHistoryEvent[];
      try {
        localStorage.setItem(`${LS_KEY}:${key}`, JSON.stringify(events));
      } catch {
        /* non-fatal */
      }
      return events;
    },
    {
      fallbackData: key ? readCache(key) : undefined,
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      keepPreviousData: true,
      errorRetryCount: 3,
    }
  );
  return { events: data ?? [], isLoading: isLoading && !data, isValidating, error };
}

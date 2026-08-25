'use client';

// Money in flight (doc 89 F2): the read side.
//
// One hook owns the list of non-settled ramp transfers and the TWO jobs that
// keep it honest:
//   - poll while anything is in flight (10s — a banner that lags the chain
//     by a minute defeats its purpose)
//   - detect ARRIVAL from the chain: when the destination wallet's balance
//     rises above the baseline captured at commit, PATCH the row to
//     `arrived`, fire the cache-bypassing portfolio refresh, and drop it
//     from the list — the message disappearing the moment assets appear is
//     the requirement this hook exists for.
//
// MoneyGram rows are NOT here: MGI has its own richer mirror, banner and
// activity rows. This hook covers the providers that had nothing.

import useSWR from 'swr';
import { buildAuthHeaders } from '@/utils/http';
import { useRef, useMemo, useEffect } from 'react';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import {
  isTerminal,
  toInFlightRamp,
  isBannerVisible,
  type RampStatus,
  type InFlightRamp,
  balanceShowsArrival,
  type RampTransferRow,
} from '@/lib/ramp/status';

interface ApiRow extends RampTransferRow {
  baselineBalance: string | null;
  status: RampStatus;
}

async function fetchTransfers(url: string): Promise<ApiRow[]> {
  const res = await fetch(url, { headers: await buildAuthHeaders(), credentials: 'include' });
  const data = await res.json().catch(() => null);
  return Array.isArray(data?.transfers) ? data.transfers : [];
}

export function useInFlightRamps(enabled = true) {
  const { data, mutate } = useSWR<ApiRow[]>(
    enabled ? '/api/ramp/transfers?active=1' : null,
    fetchTransfers,
    {
      revalidateOnFocus: true,
      // Poll only while something is actually in flight; SWR stops the timer
      // when the list is empty because we return 0 below.
      refreshInterval: (latest) =>
        latest && latest.some((r) => !isTerminal(r.status)) ? 10_000 : 0,
    }
  );

  const rows = useMemo(() => data ?? [], [data]);
  const hasActive = rows.some((r) => !isTerminal(r.status));

  // Balances for arrival detection — the same live sources every display
  // surface uses. Only enabled while something is pending.
  const balances = useWalletBalances(enabled && hasActive);

  // One arrival PATCH per row per page-life: the server's forward-only
  // machine makes repeats harmless, but not sending them is cheaper.
  const flipped = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hasActive) return;
    for (const row of rows) {
      if (isTerminal(row.status) || row.direction !== 'onramp') continue;
      if (row.chain !== 'stellar') continue; // native arrivals: chain rows + cron
      if (flipped.current.has(row.id)) continue;

      // Which wallet was the destination? The slot's assets live in the
      // aggregate; the companion reports separately — match by address.
      const isCompanion = balances.companionStellar?.address === row.walletAddress;
      const current = isCompanion
        ? Number(
            balances.companionStellar?.assets.find(
              (a) => a.symbol.toUpperCase() === row.asset.toUpperCase()
            )?.balance ?? NaN
          )
        : Number(balances.getAsset(row.asset)?.balance ?? NaN);

      if (balanceShowsArrival(row.baselineBalance, current)) {
        flipped.current.add(row.id);
        void (async () => {
          try {
            await fetch(`/api/ramp/transfers/${row.id}`, {
              method: 'PATCH',
              headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ status: 'arrived' }),
            });
          } finally {
            // Refresh balances everywhere (the doc-67 bypass) and re-read the
            // list — this is the moment the banner disappears.
            void balances.refreshFresh?.();
            void mutate();
            window.dispatchEvent(new Event('nf:activity-updated'));
          }
        })();
      }
    }
  }, [rows, hasActive, balances, mutate]);

  const inFlight: InFlightRamp[] = useMemo(
    () => rows.filter((r) => isBannerVisible(r.status)).map(toInFlightRamp),
    [rows]
  );

  return { inFlight, refresh: mutate };
}

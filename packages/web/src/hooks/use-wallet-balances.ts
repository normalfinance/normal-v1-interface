'use client';

import type { PortfolioAsset, PortfolioPayload } from '@/types/portfolio';

import useSWR from 'swr';
import { useMemo, useEffect } from 'react';
import { buildAuthHeaders } from '@/utils/http';
import { usePersistStore, useNetworkStore } from '@normalfinance/state';

// ---------------------------------------------------------------------------
// Fast wallet-balance source: one SWR instance (deduped across every view) over
// the server aggregator. Persists the last payload to localStorage for instant
// first paint (stale-while-revalidate). This is one of the sources the
// `usePortfolio` composer combines — components should read `usePortfolio`, not
// this directly, unless they only need raw wallet balances.
//
// NOTE: DISPLAY only. Action-time freshness (swap MAX, send max, off-ramp
// pre-flight) must keep its own direct live read.
// ---------------------------------------------------------------------------

const LS_KEY = 'nf:portfolio:v1';

function readCache(key: string): PortfolioPayload | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(`${LS_KEY}:${key}`);
    return raw ? (JSON.parse(raw) as PortfolioPayload) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, payload: PortfolioPayload) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LS_KEY}:${key}`, JSON.stringify(payload));
  } catch {
    /* quota / serialization — non-fatal */
  }
}

export interface UseWalletBalancesResult {
  assets: PortfolioAsset[];
  getAsset: (symbol: string) => PortfolioAsset | undefined;
  totalUsd: number;
  updatedAt: number | null;
  isLoading: boolean; // first load, no cache to show
  isValidating: boolean; // background refresh
  error: unknown;
  refresh: () => void;
}

export function useWalletBalances(enabled = true): UseWalletBalancesResult {
  const { wallet } = usePersistStore();
  const network = useNetworkStore((s) => s.network);
  const stellar = wallet.address ?? '';

  // Fetch for any signed-in user (enabled), even without a Stellar address — the
  // server aggregator reads the BTC/ETH/SOL addresses from the authed DB row, so
  // a chain-only wallet (e.g. BTC-first) still gets its balances.
  const swrKey = enabled ? `${stellar || 'none'}:${network}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<PortfolioPayload>(
    swrKey,
    async (key: string) => {
      const headers = await buildAuthHeaders();
      const res = await fetch(
        `/api/wallet/portfolio?stellar=${encodeURIComponent(stellar)}&network=${network}`,
        { headers }
      );
      if (!res.ok) throw new Error(`portfolio ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'portfolio error');
      const payload: PortfolioPayload = { updatedAt: json.updatedAt, assets: json.assets };
      writeCache(key, payload);
      return payload;
    },
    {
      fallbackData: swrKey ? readCache(swrKey) : undefined,
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      refreshInterval: 30_000,
      keepPreviousData: true,
    }
  );

  // Refresh promptly after a send/swap/off-ramp settles.
  useEffect(() => {
    const handler = () => setTimeout(() => mutate(), 800);
    window.addEventListener('nf:activity-updated', handler);
    return () => window.removeEventListener('nf:activity-updated', handler);
  }, [mutate]);

  const assets = useMemo(() => data?.assets ?? [], [data]);

  // We render from a localStorage cache, and cached data makes SWR report
  // `isLoading: false` at once — so consumers drop their skeleton immediately.
  // That is right when the cache is complete, and wrong when it was written
  // while the Stellar address was missing: it holds only the chain assets the
  // server reads from the DB row (BTC/ETH/SOL), so those paint instantly and
  // XLM/USDC appear a beat later, with no skeleton in between. Treat a cached
  // payload with no Stellar asset as "still loading" whenever we do have a
  // Stellar address to ask about.
  const cacheMissingStellar =
    !!stellar && assets.length > 0 && !assets.some((a) => a.chain === 'stellar');

  const totalUsd = useMemo(
    () => assets.reduce((acc, a) => acc + (a.usdValue ? Number(a.usdValue) : 0), 0),
    [assets]
  );

  const getAsset = useMemo(() => {
    const map = new Map(assets.map((a) => [a.symbol.toUpperCase(), a]));
    return (symbol: string) => map.get(symbol.toUpperCase());
  }, [assets]);

  return {
    assets,
    getAsset,
    totalUsd,
    updatedAt: data?.updatedAt ?? null,
    isLoading: (isLoading && !data) || (cacheMissingStellar && isValidating),
    isValidating,
    error,
    refresh: () => {
      mutate();
    },
  };
}

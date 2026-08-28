'use client';

import type { PortfolioAsset, PortfolioPayload } from '@/types/portfolio';

import useSWR from 'swr';
import { buildAuthHeaders } from '@/utils/http';
import { useMemo, useEffect, useCallback } from 'react';
import { usePersistStore, useNetworkStore } from '@normalfinance/state';
import {
  pickNewerPayload,
  portfolioCacheKey,
  readCachedPortfolio,
  writeCachedPortfolio,
} from '@/lib/portfolio/client-cache';

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

/** What an awaitable refresh actually achieved. `floored` means the server
 *  served its cache despite the bypass, so the read proved nothing. */
export interface FreshRead {
  assets: PortfolioAsset[] | null;
  /**
   * The companion Normal wallet's Stellar balances, when the connected wallet
   * is external. Kept SEPARATE from `assets` everywhere in this app — and the
   * reason a post-swap gate must be handed both: an external-wallet user
   * swapping from their Normal wallet moves balances that never appear in
   * `assets` at all (live 2026-08-28: the gate watched the connected Lobstr
   * wallet's untouched 0.00 while the companion did the swap).
   */
  companionAssets: PortfolioAsset[] | null;
  floored: boolean;
  /** Milliseconds until the server's bypass floor lifts, when it told us. */
  retryAfterMs?: number;
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
  /** Awaitable, server-cache-BYPASSING refresh (#66). This is what arrival
   *  gates (#62 "Done waits for balances") and post-action refreshes need:
   *  when the promise resolves, the shared data is genuinely fresh. Returns
   *  the fresh assets so callers can verify a specific balance moved (the
   *  #66 arrival race: a refresh fired the instant a bridge delivers can
   *  read the pre-delivery balance and lock it into the server cache) —
   *  AND whether the server actually honoured the bypass (`floored`). */
  refreshFresh: () => Promise<FreshRead>;
  /** #32 chunk 2: the companion Normal wallet's Stellar balances, when the
   *  connected wallet is external; null otherwise. Displayed as its own
   *  drawer section — never merged into `assets`. */
  companionStellar: { address: string; assets: PortfolioAsset[] } | null;
}

export function useWalletBalances(enabled = true): UseWalletBalancesResult {
  const { wallet } = usePersistStore();
  const network = useNetworkStore((s) => s.network);
  const stellar = wallet.address ?? '';

  // Fetch for any signed-in user (enabled), even without a Stellar address — the
  // server aggregator reads the BTC/ETH/SOL addresses from the authed DB row, so
  // a chain-only wallet (e.g. BTC-first) still gets its balances.
  const swrKey = enabled ? portfolioCacheKey(stellar, network) : null;

  const fetchPayload = useCallback(
    async (
      cacheKey: string,
      fresh: boolean
    ): Promise<PortfolioPayload & { floored?: boolean; retryAfterMs?: number }> => {
      const headers = await buildAuthHeaders();
      const res = await fetch(
        `/api/wallet/portfolio?stellar=${encodeURIComponent(stellar)}&network=${network}` +
          (fresh ? '&refresh=1' : ''),
        { headers }
      );
      if (!res.ok) throw new Error(`portfolio ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'portfolio error');
      const payload: PortfolioPayload & { floored?: boolean; retryAfterMs?: number } = {
        updatedAt: json.updatedAt,
        assets: json.assets,
        // Transport-only: whether the server served us its cache despite the
        // bypass. Stripped before the snapshot is written, so it can never be
        // read back from localStorage as if it described stored data.
        floored: json.floored === true,
        ...(typeof json.retryAfterMs === 'number' ? { retryAfterMs: json.retryAfterMs } : {}),
        // #32 chunk 2: the companion Normal wallet's Stellar balances (only
        // present when the connected wallet is external).
        companionStellar: json.companionStellar ?? null,
      };
      const { floored: _floored, retryAfterMs: _retryAfterMs, ...snapshot } = payload;
      writeCachedPortfolio(cacheKey, snapshot);
      return payload;
    },
    [stellar, network]
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    PortfolioPayload & { floored?: boolean; retryAfterMs?: number }
  >(swrKey, (key: string) => fetchPayload(key, false), {
    fallbackData: swrKey ? readCachedPortfolio(swrKey) : undefined,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
    refreshInterval: 30_000,
    keepPreviousData: true,
  });

  // Refresh promptly after a send/swap/off-ramp settles — with `refresh=1`, so
  // the server's 15s response cache is skipped for this one fetch and the new
  // balance is actually new (the route floors the bypass server-side). Seeded
  // back into SWR without revalidating, mirroring the activity hook's pattern.
  useEffect(() => {
    const handler = () => {
      if (!swrKey) return;
      // No-clobber seed (live 2026-08-28): this fires in EVERY mounted
      // instance of this hook (~23 across the app), 800ms after the event —
      // usually BEFORE the ledger settles, so the data is pre-action. Seeding
      // the raw promise let whichever fetch resolved LAST own the screen, and
      // a stale straggler could overwrite the post-swap gate's fresh read.
      // pickNewerPayload makes arrival order irrelevant.
      setTimeout(
        () =>
          mutate(async (current) => pickNewerPayload(current, await fetchPayload(swrKey, true)), {
            revalidate: false,
          }),
        800
      );
    };
    window.addEventListener('nf:activity-updated', handler);
    return () => window.removeEventListener('nf:activity-updated', handler);
  }, [mutate, swrKey, fetchPayload]);

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
    companionStellar: data?.companionStellar ?? null,
    updatedAt: data?.updatedAt ?? null,
    isLoading: (isLoading && !data) || (cacheMissingStellar && isValidating),
    isValidating,
    error,
    refresh: () => {
      mutate();
    },
    refreshFresh: async () => {
      if (!swrKey) return { assets: null, companionAssets: null, floored: false };
      // Fetch first, seed second — and through the no-clobber rule, so a
      // racing stale read can never rewind what this fetch is about to show.
      // The CALLER always gets this fetch's own result (the balance gate needs
      // the read it made, whichever payload ends up on screen).
      const fetched = await fetchPayload(swrKey, true);
      await mutate((current) => pickNewerPayload(current, fetched), { revalidate: false });
      // `floored` rides on the payload only so it can be read back here; it is
      // NOT part of the stored snapshot (see fetchPayload).
      return {
        assets: fetched.assets ?? null,
        companionAssets: fetched.companionStellar?.assets ?? null,
        floored: !!fetched.floored,
        retryAfterMs: fetched.retryAfterMs,
      };
    },
  };
}

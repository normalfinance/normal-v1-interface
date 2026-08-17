'use client';

import type { VaultInfo, SavingsPosition } from '@/types/savings';

import useSWR from 'swr';
import { useMemo, useEffect } from 'react';
import { reconcileSavingsPosition } from '@/lib/portfolio/normalize';
import { usePersistStore, useNetworkStore } from '@normalfinance/state';
import { savingsReadEpoch, assertReadStillFresh } from '@/lib/savings-read-guard';

// ---------------------------------------------------------------------------
// Deduped savings read — vault metadata (fast) + the user's vault position
// (slow: up to ~30s on mainnet Soroban RPC). One SWR instance per key means N
// mounted views share ONE fetch instead of each firing its own 30s call.
//
// This owns the savings cache + the indexer-lag merge; `useDefindexSavings`
// consumes it for the read and keeps the deposit/withdraw engine.
// ---------------------------------------------------------------------------

export const POSITION_SYNC_EVENT = 'nf:savings-position-updated';

// --- position cache (localStorage, keyed by address) ---
const POSITION_CACHE_KEY = 'nf_savings_position_cache_v2';
// 24h stale-while-revalidate (was 10 min): a cold tab paints the last-known
// position instantly — the same treatment every other asset already gets via
// the portfolio's localStorage cache — and the fetch then confirms in the
// background. Savings correctness never rested on this TTL: the reconciler's
// no-clobber logic and the #52 epoch guard protect every WRITE regardless of
// the cached value's age. (Observed live 2026-08-17: a cold tab showed a
// confident $0.00 for the 15-25s a cold Soroban position read takes.)
const POSITION_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  position: SavingsPosition;
  cachedAt: number;
}

function readPositionCache(): Record<string, CacheEntry> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(POSITION_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getCachedPosition(address: string | undefined): SavingsPosition | null {
  if (!address) return null;
  const entry = readPositionCache()[address];
  if (!entry?.cachedAt || Date.now() - entry.cachedAt > POSITION_TTL_MS) return null;
  return entry.position;
}

export function setCachedPosition(address: string | undefined, position: SavingsPosition): void {
  if (!address || typeof window === 'undefined') return;
  try {
    const cache = readPositionCache();
    cache[address] = { position, cachedAt: Date.now() };
    localStorage.setItem(POSITION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full */
  }
}

// --- vault-info cache (localStorage, keyed by network) ---
const VAULT_CACHE_KEY = 'nf_vault_info_cache';
const VAULT_TTL_MS = 5 * 60 * 1000;

function getCachedVaultInfo(network: string): VaultInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(VAULT_CACHE_KEY);
    if (!raw) return null;
    const entry: { vault: VaultInfo; network: string; cachedAt: number } = JSON.parse(raw);
    if (entry.network !== network) return null;
    if (!entry.cachedAt || Date.now() - entry.cachedAt > VAULT_TTL_MS) return null;
    return entry.vault;
  } catch {
    return null;
  }
}

function setCachedVaultInfo(network: string, vault: VaultInfo): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VAULT_CACHE_KEY, JSON.stringify({ vault, network, cachedAt: Date.now() }));
  } catch {
    /* storage full */
  }
}

// --- fetchers ---
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
}

async function fetchVaultInfo(network: string): Promise<VaultInfo> {
  const res = await fetchWithTimeout(`/api/savings/vault-info?network=${network}`, 12_000);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `vault-info ${res.status}`);
  }
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch vault info');
  setCachedVaultInfo(network, data.vault);
  return data.vault;
}

async function fetchUserPosition(
  address: string,
  network: string,
  fresh = false
): Promise<SavingsPosition> {
  // Snapshot the action epoch BEFORE the request: if a deposit/withdraw
  // settles while this read is in flight, the response describes a stale
  // world and must be discarded (see lib/savings-read-guard.ts).
  const epochAtStart = savingsReadEpoch(address);
  const res = await fetchWithTimeout(
    `/api/savings/user-position?user=${address}&network=${network}${fresh ? '&refresh=1' : ''}`,
    30_000 // Soroban RPC on mainnet can take 15-25s
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `user-position ${res.status}`);
  }
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch user position');

  // The route returns `userPosition: null` when it could not read the balance
  // (e.g. DeFindex rate-limits us), on the assumption the client still holds a
  // previous value. On a cold browser there is no previous value, and treating
  // null as "no position" rendered a confident 0.0 — a false statement about
  // someone's money, which is exactly what this whole path exists to avoid.
  // Throwing instead keeps SWR in its loading/retry state until a real answer
  // arrives, so the UI shows a skeleton rather than a wrong number.
  // The discard MUST happen before reconciliation and before the cache write:
  // a pre-action read that gets this far carries a genuinely-lower value the
  // reconciler would rightly accept — and would then persist. This was the
  // stuck wrong "Your Deposits" after rapid deposit/withdraw (finding #52).
  assertReadStillFresh(address, epochAtStart);

  const cachedPosition = getCachedPosition(address);
  if (data.userPosition == null && !cachedPosition) {
    throw new Error('Position unavailable — upstream read failed and no cached value');
  }

  // Reconcile against the cached value (never clobber a held position with a
  // transient 0; handle indexer lag) — pure logic in ./normalize, covered by
  // normalize.test.ts.
  const result = reconcileSavingsPosition(data.userPosition, cachedPosition);
  setCachedPosition(address, result);
  return result;
}

export interface UseSavingsPositionResult {
  vaultInfo: VaultInfo | null;
  position: SavingsPosition | null;
  /** Current USD value of the position (USDC ≈ $1). */
  value: number;
  earnings: number;
  /**
   * #32: the companion Normal wallet's savings position, read ONLY when the
   * connected wallet is external. STRICTLY display-time data — `position`,
   * `value` and every deposit/withdraw computation stay scoped to the
   * CONNECTED wallet, so action limits and commissions can never mix wallets.
   */
  companionPosition: SavingsPosition | null;
  companionValue: number;
  /** True while the companion's position (or its address lookup) is still
   *  resolving — display gates MUST include this, or a hybrid account shows
   *  a confident $0 while the slow half is loading (the register's oldest
   *  root cause: a loading flag covering only SOME of the data sources). */
  companionPositionLoading: boolean;
  refreshCompanionPosition: () => void;
  vaultLoading: boolean;
  positionLoading: boolean;
  isValidating: boolean;
  vaultError: unknown;
  positionError: unknown;
  refresh: () => void;
  refreshVault: () => void;
  refreshPosition: () => void;
  /** Optimistically set the position (e.g. after deposit/withdraw). */
  setPosition: (next: SavingsPosition) => void;
}

export function useSavingsPosition(enabled = true): UseSavingsPositionResult {
  const { wallet } = usePersistStore();
  const network = useNetworkStore((s) => s.network);
  const address = wallet.address ?? '';

  const vault = useSWR<VaultInfo>(
    enabled ? ['savings-vault', network] : null,
    () => fetchVaultInfo(network),
    {
      fallbackData: getCachedVaultInfo(network) ?? undefined,
      revalidateOnFocus: false,
      dedupingInterval: 300_000,
      keepPreviousData: true,
    }
  );

  const pos = useSWR<SavingsPosition>(
    enabled && address ? ['savings-position', address, network] : null,
    () => fetchUserPosition(address, network),
    {
      fallbackData: getCachedPosition(address) ?? undefined,
      revalidateOnFocus: false,
      // Deliberately SHORTER than the route's 30s cache. If the client waited
      // longer than the server keeps its copy, every request would arrive after
      // expiry and always miss — the trap from finding #22, with the numbers
      // the other way round. Asking a little sooner means requests usually land
      // while the server still has an answer, so the expensive DeFindex call
      // stays capped while the data stays fresh.
      dedupingInterval: 20_000,
      keepPreviousData: true,
      errorRetryCount: 3,
    }
  );

  // #32 companion savings (display + companion-scoped actions — see the
  // interface note). The address resolves through the cached single-flight
  // Turnkey lookup; the position rides the same SWR key family as a
  // normal-wallet user's own read, so nothing is fetched twice.
  const isExternalSlot = wallet.walletType != null && wallet.walletType !== 'normal-wallet';
  const companionAddr = useSWR<string | null>(
    enabled && isExternalSlot ? ['turnkey-stellar-address'] : null,
    async () => {
      const { getTurnkeyWalletInfo } = await import('@/lib/turnkey/wallet-info');
      const info = await getTurnkeyWalletInfo();
      return info?.stellarAddress ?? null;
    },
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );
  const companionAddress =
    companionAddr.data && companionAddr.data !== address ? companionAddr.data : null;
  const companionPos = useSWR<SavingsPosition>(
    enabled && companionAddress ? ['savings-position', companionAddress, network] : null,
    () => fetchUserPosition(companionAddress!, network),
    {
      fallbackData: getCachedPosition(companionAddress ?? undefined) ?? undefined,
      revalidateOnFocus: false,
      dedupingInterval: 20_000,
      keepPreviousData: true,
      errorRetryCount: 3,
    }
  );
  const companionValue = useMemo(() => {
    const v = parseFloat(companionPos.data?.currentValue || '0');
    return v > 0 ? v : 0;
  }, [companionPos.data]);
  // Loading spans BOTH phases: the address lookup and the position read.
  const companionPositionLoading =
    enabled &&
    isExternalSlot &&
    (companionAddr.isLoading ||
      (!!companionAddress && companionPos.isLoading && !companionPos.data));

  // Cross-instance / legacy sync: when an optimistic write hits the cache,
  // re-seed SWR from it so every consumer updates at once.
  useEffect(() => {
    const handler = () => {
      // 1) Show the optimistic value instantly.
      const cached = getCachedPosition(address);
      if (cached) pos.mutate(cached, { revalidate: false });
      // 2) Then confirm against the chain, bypassing the server cache. A
      //    30s-old balance immediately after depositing would look like the
      //    deposit never landed. The route floors this per address, so it
      //    can't be used to hammer DeFindex.
      if (address) {
        pos
          .mutate(fetchUserPosition(address, network, true), { revalidate: false })
          .catch(() => {});
      }
      // #32: companion ops write the COMPANION's cache — mirror the same
      // optimistic-then-confirm dance for it.
      if (companionAddress) {
        const cachedCompanion = getCachedPosition(companionAddress);
        if (cachedCompanion) companionPos.mutate(cachedCompanion, { revalidate: false });
        companionPos
          .mutate(fetchUserPosition(companionAddress, network, true), { revalidate: false })
          .catch(() => {});
      }
    };
    window.addEventListener(POSITION_SYNC_EVENT, handler);
    return () => window.removeEventListener(POSITION_SYNC_EVENT, handler);
  }, [address, network, pos, companionAddress, companionPos]);

  const value = useMemo(() => {
    const v = parseFloat(pos.data?.currentValue || '0');
    return v > 0 ? v : 0;
  }, [pos.data]);

  const earnings = useMemo(() => parseFloat(pos.data?.earnings || '0'), [pos.data]);

  return {
    vaultInfo: vault.data ?? null,
    position: pos.data ?? null,
    value,
    earnings,
    companionPosition: companionPos.data ?? null,
    companionValue,
    companionPositionLoading,
    refreshCompanionPosition: () => {
      companionPos.mutate();
    },
    vaultLoading: vault.isLoading && !vault.data,
    positionLoading: pos.isLoading && !pos.data,
    isValidating: vault.isValidating || pos.isValidating,
    vaultError: vault.error,
    positionError: pos.error,
    refresh: () => {
      vault.mutate();
      pos.mutate();
    },
    refreshVault: () => {
      vault.mutate();
    },
    refreshPosition: () => {
      pos.mutate();
    },
    setPosition: (next: SavingsPosition) => {
      setCachedPosition(address, next);
      pos.mutate(next, { revalidate: false });
    },
  };
}

'use client';

import type { VaultInfo, SavingsPosition } from '@/types/savings';

import useSWR from 'swr';
import { useMemo, useEffect } from 'react';
import { usePersistStore, useNetworkStore } from '@normalfinance/state';

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
const POSITION_TTL_MS = 10 * 60 * 1000;

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

async function fetchUserPosition(address: string, network: string): Promise<SavingsPosition> {
  const res = await fetchWithTimeout(
    `/api/savings/user-position?user=${address}&network=${network}`,
    30_000 // Soroban RPC on mainnet can take 15-25s
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `user-position ${res.status}`);
  }
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch user position');

  const apiPos: SavingsPosition | undefined = data.userPosition;
  if (!apiPos) return { shares: '0', currentValue: '0', totalDeposited: '0', earnings: '0' };

  // Reconcile against the cached value: the DeFindex events indexer lags
  // 30-120s behind on-chain state, so guard against it briefly reporting a
  // lower totalDeposited than a just-made (optimistically cached) deposit.
  const prev = getCachedPosition(address);
  let result = apiPos;
  if (prev) {
    const apiTD = parseFloat(apiPos.totalDeposited);
    const prevTD = parseFloat(prev.totalDeposited);
    const currentValue = parseFloat(apiPos.currentValue);
    const tdDrop = prevTD - apiTD;
    const smallIndexerLag = tdDrop > 0.001 && prevTD > 0 && tdDrop / prevTD < 0.2;
    const stale = apiTD > currentValue + 0.001 || smallIndexerLag;
    if (stale) {
      result = {
        ...apiPos,
        totalDeposited: prev.totalDeposited,
        earnings: Math.max(currentValue - prevTD, 0).toFixed(7),
      };
    }
  }
  setCachedPosition(address, result);
  return result;
}

export interface UseSavingsPositionResult {
  vaultInfo: VaultInfo | null;
  position: SavingsPosition | null;
  /** Current USD value of the position (USDC ≈ $1). */
  value: number;
  earnings: number;
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
      dedupingInterval: 60_000,
      keepPreviousData: true,
      errorRetryCount: 3,
    }
  );

  // Cross-instance / legacy sync: when an optimistic write hits the cache,
  // re-seed SWR from it so every consumer updates at once.
  useEffect(() => {
    const handler = () => {
      const cached = getCachedPosition(address);
      if (cached) pos.mutate(cached, { revalidate: false });
    };
    window.addEventListener(POSITION_SYNC_EVENT, handler);
    return () => window.removeEventListener(POSITION_SYNC_EVENT, handler);
  }, [address, pos]);

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

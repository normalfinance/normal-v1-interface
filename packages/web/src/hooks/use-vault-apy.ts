'use client';

import { useState, useEffect } from 'react';

const CACHE_KEY = 'nf_vault_info_cache';
const CACHE_TTL_MS = 5 * 60 * 1000;

// Module-level: survives across sibling component mounts on the same page.
// Only one fetch happens no matter how many components call this hook.
let _apy: number | null = null;
let _promise: Promise<number | null> | null = null;

function readLocalStorage(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const entry = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    if (entry.vault?.apy == null) return null;
    if (!entry.cachedAt || Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    return Number(entry.vault.apy);
  } catch { return null; }
}

function writeLocalStorage(apy: number): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ...existing,
      vault: { ...(existing.vault ?? {}), apy },
      cachedAt: Date.now(),
      network: 'mainnet',
    }));
  } catch { /* storage full */ }
}

function getOrFetchApy(): Promise<number | null> {
  if (_promise) return _promise;
  _promise = fetch('/api/savings/vault-info?network=mainnet')
    .then((r) => r.json())
    .then((data) => {
      const val = data?.vault?.apy != null ? Number(data.vault.apy) : null;
      if (val != null) {
        _apy = val;
        writeLocalStorage(val);
      }
      return val;
    })
    .catch(() => null);
  return _promise;
}

export function useVaultApy(): number | null {
  const [apy, setApy] = useState<number | null>(() => {
    if (_apy != null) return _apy;          // module cache (same page)
    const ls = readLocalStorage();
    if (ls != null) { _apy = ls; return ls; } // localStorage (cross-page)
    return null;
  });

  useEffect(() => {
    if (apy != null) return;
    getOrFetchApy().then((val) => { if (val != null) setApy(val); });
  }, []);

  return apy;
}

// packages/web/src/utils/wallet-proof.ts

const KEY = 'nf_verified_addrs';

export function isWalletVerifiedForSession(address?: string | null): boolean {
  if (!address || typeof window === 'undefined') return false;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const map = JSON.parse(raw) as Record<string, boolean>;
    return !!map[address];
  } catch {
    return false;
  }
}

export function markWalletVerifiedForSession(address: string): void {
  if (typeof window === 'undefined') return;
  const raw = window.sessionStorage.getItem(KEY);
  const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  map[address] = true;
  window.sessionStorage.setItem(KEY, JSON.stringify(map));
}

export function clearWalletVerifiedForSession(address?: string | null): void {
  if (!address || typeof window === 'undefined') return;
  const raw = window.sessionStorage.getItem(KEY);
  const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  if (address in map) {
    delete map[address];
    window.sessionStorage.setItem(KEY, JSON.stringify(map));
  }
}

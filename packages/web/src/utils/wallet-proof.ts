// packages/web/src/utils/wallet-proof.ts
const MAP_KEY = 'nf_verified_addrs';

function safeGetMap(): Record<string, boolean> {
  try {
    const raw = window.sessionStorage.getItem(MAP_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, boolean>) {
  window.sessionStorage.setItem(MAP_KEY, JSON.stringify(map));
}

export function isWalletVerifiedForSession(address?: string | null): boolean {
  if (!address || typeof window === 'undefined') return false;

  // 1) Preferred source: JSON map
  const map = safeGetMap();
  if (map[address]) return true;

  // 2) Back-compat: legacy per-address key → migrate on read
  const legacy = window.sessionStorage.getItem(`wallet_verified_${address}`);
  if (legacy === 'true') {
    map[address] = true;
    saveMap(map);
    window.sessionStorage.removeItem(`wallet_verified_${address}`);
    return true;
  }

  return false;
}

export function markWalletVerifiedForSession(address: string): void {
  if (typeof window === 'undefined') return;

  const map = safeGetMap();
  map[address] = true;
  saveMap(map);

  // Clean up any legacy entry
  window.sessionStorage.removeItem(`wallet_verified_${address}`);

  // Notify listeners (drawer, cards, etc.)
  window.dispatchEvent(new CustomEvent('nf:walletVerified', { detail: { address } }));
}

export function clearWalletVerifiedForSession(address?: string | null): void {
  if (!address || typeof window === 'undefined') return;

  const map = safeGetMap();
  if (map[address]) {
    delete map[address];
    saveMap(map);
  }

  // Clean up any legacy entry
  window.sessionStorage.removeItem(`wallet_verified_${address}`);

  window.dispatchEvent(new CustomEvent('nf:walletUnverified', { detail: { address } }));
}

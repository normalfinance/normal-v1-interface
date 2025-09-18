const KEY = 'nf_verified_addrs';

export function isWalletVerifiedForSession(address?: string | null): boolean {
  if (!address) return false;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const map = JSON.parse(raw) as Record<string, boolean>;
    return !!map[address];
  } catch {
    return false;
  }
}

export function setWalletVerifiedForSession(address: string, value: boolean) {
  const raw = sessionStorage.getItem(KEY);
  const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  map[address] = value;
  sessionStorage.setItem(KEY, JSON.stringify(map));
}

export function isWalletVerifiedForSession(address?: string | null): boolean {
  if (!address) return false;
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(`wallet_verified_${address}`) === 'true';
}

export function markWalletVerifiedForSession(address: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(`wallet_verified_${address}`, 'true');
}

export function clearWalletVerifiedForSession(address?: string | null): void {
  if (!address || typeof window === 'undefined') return;
  window.sessionStorage.removeItem(`wallet_verified_${address}`);
}

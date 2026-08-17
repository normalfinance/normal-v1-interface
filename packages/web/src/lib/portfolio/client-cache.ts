import type { PortfolioPayload } from '@/types/portfolio';

// ---------------------------------------------------------------------------
// The client-side portfolio snapshot (localStorage, stale-while-revalidate).
// `useWalletBalances` writes it after every successful fetch; a cold tab reads
// it for instant first paint. This module owns the key format so every reader
// stays in lockstep with the writer — the savings hook seeds its companion
// Normal-wallet address from here, and a silent key drift between the two
// files would quietly bring back the cold-tab $0.00 savings bug.
// ---------------------------------------------------------------------------

const LS_KEY = 'nf:portfolio:v1';

/** Cache key per (connected Stellar address, network) — matches the SWR key. */
export function portfolioCacheKey(stellar: string, network: string): string {
  return `${stellar || 'none'}:${network}`;
}

export function readCachedPortfolio(cacheKey: string): PortfolioPayload | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(`${LS_KEY}:${cacheKey}`);
    return raw ? (JSON.parse(raw) as PortfolioPayload) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCachedPortfolio(cacheKey: string, payload: PortfolioPayload): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LS_KEY}:${cacheKey}`, JSON.stringify(payload));
  } catch {
    /* quota / serialization — non-fatal */
  }
}

/**
 * The companion Normal wallet's Stellar address, from the last portfolio
 * snapshot for this (connected wallet, network). `null` means "no cached
 * answer" — callers must treat it as unknown, NOT as "the user has no
 * companion wallet"; only a live lookup can assert that.
 */
export function readCachedCompanionStellarAddress(stellar: string, network: string): string | null {
  const payload = readCachedPortfolio(portfolioCacheKey(stellar, network));
  return payload?.companionStellar?.address ?? null;
}

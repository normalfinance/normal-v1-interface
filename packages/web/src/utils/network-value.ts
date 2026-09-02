import type { NetworkType } from '@normalfinance/utils';

/**
 * Doc 95 Wave 7 — normalise anything into a NetworkType, or null when it is
 * not one.
 *
 * Deliberately dependency-free and in its own module: the cookie readers that
 * use it pull in the whole server util package (and, transitively, ESM-only
 * packages jest cannot parse), while this decision is pure and worth pinning
 * with tests. `import type` is erased at build time, so nothing is imported
 * at runtime.
 */
export function parseNetwork(value: string | null | undefined): NetworkType | null {
  const v = value?.trim().toLowerCase();
  if (v === 'mainnet' || v === 'testnet') return v;
  return null;
}

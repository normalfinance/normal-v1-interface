/**
 * @jest-environment jsdom
 */
import { it, expect, describe, beforeEach } from '@jest/globals';

import {
  portfolioCacheKey,
  readCachedPortfolio,
  writeCachedPortfolio,
  readCachedCompanionStellarAddress,
} from './client-cache';

// The companion-address seed is the first link in the savings cold-load chain:
// useWalletBalances WRITES this cache, use-savings-position READS it to know
// which Normal wallet's position to paint before any network call answers.
// These tests pin the on-disk format — if it drifts, every existing browser's
// cache silently misses and the cold-tab "Savings $0.00" bug returns with no
// compile error anywhere.

const EXT = 'GCY3ZSMRFNWMDLNHZLF2AX4YJ7GTI5A7EJFPTK5LQYIS6LS3NSVJDA4S';
const COMPANION = 'GA5GD6PTEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXABCD';

const payload = (companion: string | null) => ({
  updatedAt: 1723900000000,
  assets: [],
  companionStellar: companion ? { address: companion, assets: [] } : null,
});

describe('portfolio client cache', () => {
  beforeEach(() => localStorage.clear());

  it('keys per (address, network), with "none" for a missing address', () => {
    expect(portfolioCacheKey(EXT, 'mainnet')).toBe(`${EXT}:mainnet`);
    expect(portfolioCacheKey('', 'testnet')).toBe('none:testnet');
  });

  it('stores under the nf:portfolio:v1 namespace (on-disk compatibility)', () => {
    writeCachedPortfolio(portfolioCacheKey(EXT, 'mainnet'), payload(COMPANION));
    expect(localStorage.getItem(`nf:portfolio:v1:${EXT}:mainnet`)).not.toBeNull();
  });

  it('round-trips the companion address for the matching wallet+network', () => {
    writeCachedPortfolio(portfolioCacheKey(EXT, 'mainnet'), payload(COMPANION));
    expect(readCachedCompanionStellarAddress(EXT, 'mainnet')).toBe(COMPANION);
  });

  it('returns null — "unknown", never a fabricated answer — when nothing is cached', () => {
    expect(readCachedCompanionStellarAddress(EXT, 'mainnet')).toBeNull();
  });

  it('does not leak a snapshot across networks or wallets', () => {
    writeCachedPortfolio(portfolioCacheKey(EXT, 'mainnet'), payload(COMPANION));
    expect(readCachedCompanionStellarAddress(EXT, 'testnet')).toBeNull();
    expect(readCachedCompanionStellarAddress(COMPANION, 'mainnet')).toBeNull();
  });

  it('treats an explicit companionStellar: null payload as no companion', () => {
    writeCachedPortfolio(portfolioCacheKey(EXT, 'mainnet'), payload(null));
    expect(readCachedCompanionStellarAddress(EXT, 'mainnet')).toBeNull();
  });

  it('survives a corrupted cache entry', () => {
    localStorage.setItem(`nf:portfolio:v1:${EXT}:mainnet`, '{not json');
    expect(readCachedPortfolio(portfolioCacheKey(EXT, 'mainnet'))).toBeUndefined();
    expect(readCachedCompanionStellarAddress(EXT, 'mainnet')).toBeNull();
  });
});

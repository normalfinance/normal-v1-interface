/**
 * @jest-environment jsdom
 */
import { it, expect, describe, beforeEach } from '@jest/globals';

import {
  pickNewerPayload,
  portfolioCacheKey,
  readCachedPortfolio,
  fillErroredFromKnown,
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

// ---------------------------------------------------------------------------
// No-clobber (live 2026-08-28): the balance gate fetched post-swap values and
// logged changed=true, yet the screen kept pre-swap numbers — one of ~23
// event-handler refreshes (fired pre-ledger) resolved AFTER it and overwrote
// the SWR cache and this snapshot. Arrival order must be meaningless.
// ---------------------------------------------------------------------------
describe('pickNewerPayload', () => {
  const at = (updatedAt: number) => ({ updatedAt, assets: [], companionStellar: null });

  it('lets a newer aggregation replace an older one', () => {
    expect(pickNewerPayload(at(1_000), at(2_000)).updatedAt).toBe(2_000);
  });

  it('REJECTS an older aggregation arriving late — the live bug', () => {
    expect(pickNewerPayload(at(2_000), at(1_000)).updatedAt).toBe(2_000);
  });

  it('takes the incoming copy on a tie (same aggregation, fresher transport)', () => {
    const incoming = at(1_500);
    expect(pickNewerPayload(at(1_500), incoming)).toBe(incoming);
  });

  it('accepts anything when there is nothing yet', () => {
    expect(pickNewerPayload(undefined, at(1)).updatedAt).toBe(1);
  });

  it('never lets an undated payload replace a dated one', () => {
    expect(pickNewerPayload(at(2_000), at(0)).updatedAt).toBe(2_000);
  });
});

describe('writeCachedPortfolio no-clobber', () => {
  beforeEach(() => localStorage.clear());
  const key = portfolioCacheKey(EXT, 'mainnet');
  const at = (updatedAt: number) => ({ updatedAt, assets: [], companionStellar: null });

  it('ignores a stale write after a fresher one', () => {
    writeCachedPortfolio(key, at(2_000));
    writeCachedPortfolio(key, at(1_000)); // the late straggler
    expect(readCachedPortfolio(key)?.updatedAt).toBe(2_000);
  });

  it('still moves forward normally', () => {
    writeCachedPortfolio(key, at(1_000));
    writeCachedPortfolio(key, at(2_000));
    expect(readCachedPortfolio(key)?.updatedAt).toBe(2_000);
  });
});

// ---------------------------------------------------------------------------
// Live 2026-08-28: ETH showed correctly after a swap, then a refresh whose ETH
// source had FAILED arrived (balance null) and the mappers coerced null to
// '0' — the balance flashed to zero until the next good read. A known number
// must never be replaced by a hole.
// ---------------------------------------------------------------------------
describe('fillErroredFromKnown', () => {
  const eth = (balance: string | null, status = balance === null ? 'error' : 'ok') =>
    ({ symbol: 'ETH', chain: 'ethereum', balance, status, price: '2500' }) as any;
  const wrap = (assets: any[]) => ({ updatedAt: 2_000, assets, companionStellar: null }) as any;

  it('keeps the known balance when the incoming row errored — the live flash-to-zero', () => {
    const out = fillErroredFromKnown(wrap([eth(null)]), wrap([eth('0.0042')]));
    expect(out.assets[0].balance).toBe('0.0042');
    expect(out.assets[0].status).toBe('stale');
  });

  it('lets a REAL zero through — an emptied wallet is not an error', () => {
    const out = fillErroredFromKnown(wrap([eth('0')]), wrap([eth('0.0042')]));
    expect(out.assets[0].balance).toBe('0');
    expect(out.assets[0].status).toBe('ok');
  });

  it('keeps the incoming price on a patched row when it has one', () => {
    const incoming = wrap([{ ...eth(null), price: '2600' }]);
    const out = fillErroredFromKnown(incoming, wrap([eth('0.0042')]));
    expect(out.assets[0].price).toBe('2600');
  });

  it('leaves an errored row alone when nothing was ever known', () => {
    const out = fillErroredFromKnown(wrap([eth(null)]), wrap([eth(null)]));
    expect(out.assets[0].balance).toBeNull();
    expect(fillErroredFromKnown(wrap([eth(null)]), undefined).assets[0].balance).toBeNull();
  });

  it('matches rows by chain AND symbol, never across chains', () => {
    const stellarUsdc = { symbol: 'USDC', chain: 'stellar', balance: '50', status: 'ok' } as any;
    const brokenEth = eth(null);
    const out = fillErroredFromKnown(wrap([brokenEth]), wrap([stellarUsdc]));
    expect(out.assets[0].balance).toBeNull();
  });
});

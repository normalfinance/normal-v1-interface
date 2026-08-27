import { parseNetwork } from './network-value';

describe('parseNetwork', () => {
  it('accepts the two real networks', () => {
    expect(parseNetwork('mainnet')).toBe('mainnet');
    expect(parseNetwork('testnet')).toBe('testnet');
  });

  it('tolerates casing and stray whitespace from a cookie or env value', () => {
    expect(parseNetwork(' MAINNET ')).toBe('mainnet');
    expect(parseNetwork('Testnet')).toBe('testnet');
  });

  it('returns null for anything else, so the caller falls back deliberately', () => {
    // The important case: a junk cookie must NOT be cast straight to
    // NetworkType the way `cookie.value as NetworkType` used to do.
    expect(parseNetwork('futurenet')).toBeNull();
    expect(parseNetwork('')).toBeNull();
    expect(parseNetwork(null)).toBeNull();
    expect(parseNetwork(undefined)).toBeNull();
  });
});

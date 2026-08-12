// Pins the #62 follow-up: the tab that ran a swap must be able to tell its
// own activity feed the terminal state before the server's 30s PENDING cache
// catches up — and hash lookups must survive casing differences between our
// broadcast result and the indexer's response.
import { it, expect, describe } from '@jest/globals';
import { getLifiStatusOverride, registerLifiStatusOverride } from '@/lib/lifi/status-overrides';

describe('lifi status overrides (#62 follow-up)', () => {
  it('returns the registered terminal state', () => {
    registerLifiStatusOverride('0xABCdef', 'DONE');
    expect(getLifiStatusOverride('0xABCdef')).toBe('DONE');
  });

  it('is case-insensitive on the hash (hex casing varies by source)', () => {
    registerLifiStatusOverride('0xFEED01', 'REFUNDED');
    expect(getLifiStatusOverride('0xfeed01')).toBe('REFUNDED');
  });

  it('unknown hash → undefined (server answer is used)', () => {
    expect(getLifiStatusOverride('0xnothere')).toBeUndefined();
  });
});

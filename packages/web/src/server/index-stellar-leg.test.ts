// Doc 129 Phase 4: Core 4's Stellar coin. Pins the amount reading the server
// uses to refuse a swap that is not exactly the coin's share.
import type * as StellarLegModule from '@/server/index-stellar-leg';

import { it, jest, expect, describe } from '@jest/globals';

// Mock BEFORE require (repo convention): prisma, the leg runner's import
// chain, and @normalfinance/utils (ESM jose) stay out of a unit test.
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/server/index-legs', () => ({ markPurchaseIfSettled: jest.fn() }));
jest.mock('@normalfinance/utils', () => ({ getStellarConfigForNetwork: () => ({}) }));

const { wireOf } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/server/index-stellar-leg') as typeof StellarLegModule;

describe('wireOf', () => {
  it('reads 7-decimal amounts as 6-decimal wire units', () => {
    expect(wireOf('3.6914500')).toBe(3_691_450n);
    expect(wireOf('0.0185500')).toBe(18_550n);
    expect(wireOf('12')).toBe(12_000_000n);
  });

  it('refuses anything that is not a plain amount', () => {
    expect(wireOf('1.123456789')).toBeNull();
    expect(wireOf('-1')).toBeNull();
    expect(wireOf('NaN')).toBeNull();
    expect(wireOf(3.5)).toBeNull();
  });
});

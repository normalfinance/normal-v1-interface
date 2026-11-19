import { it, jest, expect, describe } from '@jest/globals';

// Doc 129 Phase 5: XLM → BTC/ETH/SOL is offered only where one-signature
// transfers (pre-signed permissions) are switched on: it is built on them.
import type * as TypesModule from './types';

const load = (flag: string | undefined): typeof TypesModule => {
  let mod: typeof TypesModule | null = null;
  const before = process.env.NEXT_PUBLIC_STELLAR_PERMISSIONS;
  if (flag === undefined) delete process.env.NEXT_PUBLIC_STELLAR_PERMISSIONS;
  else process.env.NEXT_PUBLIC_STELLAR_PERMISSIONS = flag;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('./types') as typeof TypesModule;
  });
  if (before === undefined) delete process.env.NEXT_PUBLIC_STELLAR_PERMISSIONS;
  else process.env.NEXT_PUBLIC_STELLAR_PERMISSIONS = before;
  return mod!;
};

describe('XLM as a Circle source', () => {
  it('is offered with one-signature transfers on', () => {
    const { canPair, pairTypeOf } = load('1');
    expect(canPair('XLM', 'BTC')).toBe(true);
    expect(canPair('XLM', 'ETH')).toBe(true);
    expect(canPair('XLM', 'SOL')).toBe(true);
    expect(pairTypeOf('XLM', 'BTC')).toBe('cctp');
  });

  it('is not offered with them off, and nothing else changes', () => {
    const { canPair } = load(undefined);
    expect(canPair('XLM', 'BTC')).toBe(false);
    expect(canPair('XLM', 'USDC')).toBe(true);
    expect(canPair('USDC', 'BTC')).toBe(true);
    expect(canPair('BTC', 'USDC')).toBe(true);
    expect(canPair('BTC', 'XLM')).toBe(false);
  });
});

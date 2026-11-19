// Doc 129 Phase 2b: "Move to Stellar". The server lets the person's own Base
// USDC skip the $10 swap minimum only when both ends are their own (read from
// the wallet row), the amount is at least $1 and at most what Base holds.
import type * as BaseUsdcModule from '@/server/base-usdc';

import { it, jest, expect, describe } from '@jest/globals';

// Mock BEFORE require (repo convention): the config import chain pulls
// @normalfinance/utils, whose build includes jose (ESM) that jest can't parse.
jest.mock('@normalfinance/utils', () => ({ constants: { StellarConfig: {} } }));

const {
  balanceOfCalldata,
  BRING_HOME_WORDS,
  BRING_HOME_MIN_WIRE,
  bringHomeAmountRefusal,
  bringHomeOwnershipRefusal,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('@/server/base-usdc') as typeof BaseUsdcModule;

const DOMAINS = { base: 6, stellar: 27 };
const EVM = '0x8ba1f109551bD432803012645Ac136ddd64DBA72';
const G = 'GB2YWVAJQ6IY3PSV6ZL44KZ2GVQDWYIPJVDP4MTFPB7FQWIE3WJ7CTJF';
const wallet = { ethereumAddress: EVM, stellarAddress: G };
const move = {
  direction: 'crosschain_to_stellar',
  sourceDomain: 6,
  destDomain: 27,
  srcAsset: 'USDC',
  dstAsset: 'USDC',
  srcAddress: EVM.toLowerCase(),
  destAddress: G,
};

describe('bringHomeOwnershipRefusal', () => {
  it('accepts the person’s own Base address to their own Stellar wallet', () => {
    expect(bringHomeOwnershipRefusal(move, wallet, DOMAINS)).toBeNull();
  });

  it('refuses any other Stellar destination', () => {
    const other = 'GASJBZXXQVDKJBSKRJOTOE5TPVTIE36QY46BPWI6P7SMOY5K74KLXVYV';
    expect(bringHomeOwnershipRefusal({ ...move, destAddress: other }, wallet, DOMAINS)).toEqual({
      status: 403,
      error: BRING_HOME_WORDS.notOwn,
    });
  });

  it('refuses another Base source, another route, another coin, or no wallet', () => {
    expect(
      bringHomeOwnershipRefusal({ ...move, srcAddress: '0x' + '1'.repeat(40) }, wallet, DOMAINS)
    ).not.toBeNull();
    expect(bringHomeOwnershipRefusal({ ...move, sourceDomain: 0 }, wallet, DOMAINS)).not.toBeNull();
    expect(
      bringHomeOwnershipRefusal({ ...move, direction: 'stellar_to_crosschain' }, wallet, DOMAINS)
    ).not.toBeNull();
    expect(bringHomeOwnershipRefusal({ ...move, dstAsset: 'BTC' }, wallet, DOMAINS)).not.toBeNull();
    expect(bringHomeOwnershipRefusal(move, null, DOMAINS)).not.toBeNull();
    expect(
      bringHomeOwnershipRefusal(move, { ethereumAddress: EVM, stellarAddress: null }, DOMAINS)
    ).not.toBeNull();
  });
});

describe('bringHomeAmountRefusal', () => {
  it('at least $1', () => {
    expect(bringHomeAmountRefusal(BRING_HOME_MIN_WIRE - 1n, 50_000_000n)?.error).toBe(
      BRING_HOME_WORDS.tooSmall
    );
    expect(bringHomeAmountRefusal(BRING_HOME_MIN_WIRE, 50_000_000n)).toBeNull();
  });

  it('never more than Base holds right now', () => {
    expect(bringHomeAmountRefusal(23_400_001n, 23_400_000n)?.error).toBe(BRING_HOME_WORDS.tooMuch);
    expect(bringHomeAmountRefusal(23_400_000n, 23_400_000n)).toBeNull();
  });
});

describe('balanceOfCalldata', () => {
  it('is balanceOf(address) with the address left-padded to 32 bytes', () => {
    expect(balanceOfCalldata(EVM)).toBe(
      '0x70a08231000000000000000000000000' + EVM.slice(2).toLowerCase()
    );
  });

  it('refuses anything that is not an EVM address', () => {
    expect(() => balanceOfCalldata(G)).toThrow();
  });
});

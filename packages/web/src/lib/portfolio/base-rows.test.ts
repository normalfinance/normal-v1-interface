// Doc 129: USDC and ETH on the person's Base address. Pins: the rows are their
// own (chain 'base', own decimals, own snapshot keys, own contract ids), a
// failed Base read never shows a made-up zero, a last known value is only
// reused for the SAME address, and each Base row sits right under its coin.
import type * as DisplayModule from '@/lib/portfolio/display';
import type { PortfolioAsset, PortfolioPayload } from '@/types/portfolio';

import { it, jest, expect, describe } from '@jest/globals';
import { fillErroredFromKnown } from '@/lib/portfolio/client-cache';
import {
  buildAsset,
  buildBaseAsset,
  baseSnapshotKey,
  applyStaleFallback,
} from '@/lib/portfolio/normalize';

// Mock BEFORE require (repo convention): @normalfinance/utils' build pulls
// jose (ESM) that jest cannot parse; display only needs the icon helpers.
jest.mock('@normalfinance/utils', () => ({
  cdn: (p: string) => `https://cdn.test/${p}`,
  getCryptoIconUrl: (s: string) => `https://cdn.test/${s}`,
}));

const { isBaseToken, placeBaseRows, baseAssetToToken, BASE_TOKEN_CONTRACTS } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/lib/portfolio/display') as typeof DisplayModule;

const ADDR = '0x00000000000000000000000000000000000000aa';
const OTHER = '0x00000000000000000000000000000000000000bb';

describe('buildBaseAsset', () => {
  it('marks the row as Base, with Base decimals (USDC 6, ETH 18)', () => {
    const usdc = buildBaseAsset('USDC', ADDR, 12.5, 1);
    expect(usdc).toMatchObject({ symbol: 'USDC', chain: 'base', decimals: 6, balance: '12.5' });
    expect(usdc.usdValue).toBe('12.5');
    expect(buildBaseAsset('ETH', ADDR, 0.0004, 3000)).toMatchObject({
      chain: 'base',
      decimals: 18,
    });
  });

  it('a failed read is an error with no balance, never a zero', () => {
    const errored = buildBaseAsset('USDC', ADDR, null, 1);
    expect(errored.status).toBe('error');
    expect(errored.balance).toBeNull();
  });
});

describe('applyStaleFallback with Base rows', () => {
  const fresh = (base: PortfolioAsset[]) => ({
    updatedAt: 2,
    assets: [buildAsset('USDC', 'G-stellar', 5, 1)],
    base: { address: ADDR, assets: base },
  });

  it('keeps Base rows under their own keys, apart from Stellar USDC', () => {
    const { snapshot } = applyStaleFallback(fresh([buildBaseAsset('USDC', ADDR, 7, 1)]), null);
    expect(snapshot.USDC.chain).toBe('stellar');
    expect(snapshot[baseSnapshotKey('USDC')].chain).toBe('base');
    expect(snapshot[baseSnapshotKey('USDC')].balance).toBe('7');
  });

  it('serves the last good Base value, marked stale, when Base does not answer', () => {
    const prior = buildBaseAsset('USDC', ADDR, 7, 1);
    const { merged } = applyStaleFallback(fresh([buildBaseAsset('USDC', ADDR, null, 1)]), {
      [baseSnapshotKey('USDC')]: prior,
    });
    expect(merged.base?.assets[0]).toMatchObject({ balance: '7', status: 'stale' });
  });

  it('never shows another address’s last value', () => {
    const prior = buildBaseAsset('USDC', OTHER, 7, 1);
    const { merged } = applyStaleFallback(fresh([buildBaseAsset('USDC', ADDR, null, 1)]), {
      [baseSnapshotKey('USDC')]: prior,
    });
    expect(merged.base?.assets[0].status).toBe('error');
  });

  it('a payload without Base stays without Base', () => {
    const { merged } = applyStaleFallback({ updatedAt: 1, assets: [] }, null);
    expect('base' in merged).toBe(false);
  });
});

describe('fillErroredFromKnown with Base rows', () => {
  const payload = (balance: number | null, address = ADDR): PortfolioPayload => ({
    updatedAt: 1,
    assets: [buildAsset('XLM', 'G-stellar', 10, 0.1)],
    base: { address, assets: [buildBaseAsset('USDC', address, balance, 1)] },
  });

  it('keeps a known Base balance when a fresh read errors', () => {
    const out = fillErroredFromKnown(payload(null), payload(9));
    expect(out.base?.assets[0]).toMatchObject({ balance: '9', status: 'stale' });
  });

  it('not across addresses', () => {
    const out = fillErroredFromKnown(payload(null, ADDR), payload(9, OTHER));
    expect(out.base?.assets[0].balance).toBeNull();
  });

  it('a real zero stays zero', () => {
    const out = fillErroredFromKnown(payload(0), payload(9));
    expect(out.base?.assets[0].balance).toBe('0');
  });
});

describe('Base rows on Home and Assets', () => {
  it('have their own contract ids and labels', () => {
    const usdc = baseAssetToToken(buildBaseAsset('USDC', ADDR, 3, 1));
    const eth = baseAssetToToken(buildBaseAsset('ETH', ADDR, 0.001, 3000));
    expect(usdc.contract).toBe(BASE_TOKEN_CONTRACTS.USDC);
    expect(usdc.name.endsWith(' · Base')).toBe(true);
    expect(eth.name.endsWith(' · Base · Network fees')).toBe(true);
    expect(isBaseToken(usdc)).toBe(true);
    expect(isBaseToken({ contract: 'USDC' })).toBe(false);
  });

  it('sit right under their own coin, whatever the value order', () => {
    const rows = [
      { symbol: 'BTC', contract: '__btc__' },
      { symbol: 'USDC', contract: BASE_TOKEN_CONTRACTS.USDC },
      { symbol: 'ETH', contract: '__eth__' },
      { symbol: 'USDC', contract: 'USDC' },
      { symbol: 'ETH', contract: BASE_TOKEN_CONTRACTS.ETH },
    ];
    expect(placeBaseRows(rows).map((r) => r.contract)).toEqual([
      '__btc__',
      '__eth__',
      BASE_TOKEN_CONTRACTS.ETH,
      'USDC',
      BASE_TOKEN_CONTRACTS.USDC,
    ]);
  });

  it('a Base row whose coin has no row of its own goes last', () => {
    const rows = [
      { symbol: 'USDC', contract: BASE_TOKEN_CONTRACTS.USDC },
      { symbol: 'BTC', contract: '__btc__' },
    ];
    expect(placeBaseRows(rows).map((r) => r.contract)).toEqual([
      '__btc__',
      BASE_TOKEN_CONTRACTS.USDC,
    ]);
  });
});

// Pins the P0-1 (#66) mapper: the swap-card/send-modal Token shape must
// survive the move from browser-direct fetches to the shared server
// aggregate byte-for-byte — a drifted contract here is invisible until a
// MAX button or USD estimate is wrong.
import type { PortfolioAsset } from '@/types/portfolio';
import type * as NativeTokenModule from '@/lib/portfolio/native-token';

import { it, jest, expect, describe } from '@jest/globals';

// Mock BEFORE require (repo convention): @normalfinance/utils' build pulls
// jose (ESM) that jest cannot parse; only cdn() is used here.
jest.mock('@normalfinance/utils', () => ({
  cdn: (p: string) => `https://cdn.test/${p}`,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nativeToken = require('@/lib/portfolio/native-token') as typeof NativeTokenModule;

const { nativeAssetToToken } = nativeToken;

const asset = (over: Partial<PortfolioAsset> = {}): PortfolioAsset =>
  ({
    symbol: 'ETH',
    chain: 'ethereum',
    address: '0xabc',
    balance: '0.5',
    price: '3200',
    usdValue: '1600',
    change24h: -1.2,
    decimals: 18,
    status: 'ok',
    ...over,
  }) as PortfolioAsset;

describe('nativeAssetToToken (#66)', () => {
  it('maps the aggregate row onto the legacy Token contract', () => {
    const token = nativeAssetToToken(asset(), 'ethereum');
    expect(token).toMatchObject({
      symbol: 'ETH',
      contract: '__eth__',
      name: 'Ethereum',
      decimals: 18,
      balance: '0.5',
      price: '3200',
      percentageChange: -1.2,
    });
  });

  it('missing aggregate row → null (absent card is honest, zero is a lie)', () => {
    expect(nativeAssetToToken(undefined, 'bitcoin')).toBeNull();
  });

  it('null balance/price default to "0" strings (Token contract is strings)', () => {
    const token = nativeAssetToToken(
      asset({ balance: null, price: null, change24h: null }),
      'solana'
    );
    expect(token).toMatchObject({
      balance: '0',
      price: '0',
      percentageChange: 0,
      contract: '__sol__',
    });
  });

  it('stale rows still map — last-good numbers beat an empty card', () => {
    const token = nativeAssetToToken(asset({ status: 'stale' }), 'ethereum');
    expect(token?.balance).toBe('0.5');
  });
});

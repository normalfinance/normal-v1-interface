import { it, expect, describe } from '@jest/globals';

import { minSpanFor, priceDomain, COINGECKO_IDS, normalizeMarkets } from './markets';

// A /coins/markets row as CoinGecko sends it (the fields we read, plus noise).
const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  current_price: 87336.62,
  market_cap: 1739000000000,
  market_cap_rank: 1,
  total_volume: 38200000000,
  high_24h: 88400.5,
  low_24h: 85900.12,
  price_change_percentage_24h: -0.8,
  circulating_supply: 19950000,
  max_supply: 21000000,
  ath: 126080,
  ath_change_percentage: -30.73,
  ath_date: '2025-10-06T18:57:42.558Z',
  roi: null,
  sparkline_in_7d: { price: Array.from({ length: 168 }, (_, i) => 80000 + i * 41.123456789) },
  ...overrides,
});

describe('normalizeMarkets', () => {
  it('maps a CoinGecko row to our symbol and fields', () => {
    const [btc] = normalizeMarkets([row()]);
    expect(btc).toMatchObject({
      symbol: 'BTC',
      price: 87336.62,
      change24h: -0.8,
      marketCap: 1739000000000,
      rank: 1,
      volume24h: 38200000000,
      high24h: 88400.5,
      low24h: 85900.12,
      circulatingSupply: 19950000,
      maxSupply: 21000000,
      ath: 126080,
      athChangePct: -30.73,
      athDate: '2025-10-06T18:57:42.558Z',
    });
  });

  it('keeps the last day of the hourly sparkline, ending on the current price', () => {
    const [btc] = normalizeMarkets([row()]);
    // 25 hourly points (both ends of the day) plus the price itself.
    expect(btc.sparkline24h).toHaveLength(26);
    expect(btc.sparkline24h[btc.sparkline24h.length - 1]).toBe(87336.6);
    // Trimmed to six significant digits: a 32px line needs no more.
    btc.sparkline24h.forEach((v) =>
      expect(String(v).replace(/[.-]/g, '').length).toBeLessThanOrEqual(6)
    );
  });

  it('turns missing numbers into null, never zero', () => {
    const [eth] = normalizeMarkets([
      row({ id: 'ethereum', max_supply: null, market_cap_rank: undefined, ath_date: 7 }),
    ]);
    expect(eth.symbol).toBe('ETH');
    expect(eth.maxSupply).toBeNull();
    expect(eth.rank).toBeNull();
    expect(eth.athDate).toBeNull();
  });

  it('drops rows it cannot read, and coins we do not list', () => {
    expect(
      normalizeMarkets([row({ current_price: null }), row({ id: 'dogecoin' }), null, 'x'])
    ).toEqual([]);
    expect(normalizeMarkets({ error: 'rate limited' })).toEqual([]);
  });

  it('leaves the sparkline empty when there is no history to draw', () => {
    const [btc] = normalizeMarkets([row({ sparkline_in_7d: undefined })]);
    expect(btc.sparkline24h).toEqual([]);
  });

  it('knows every coin the app lists', () => {
    expect(Object.keys(COINGECKO_IDS).sort()).toEqual(['BTC', 'ETH', 'SOL', 'USDC', 'XLM']);
  });
});

describe('priceDomain', () => {
  it('fits a line that moved more than the least span', () => {
    expect(priceDomain([100, 110, 105])).toEqual({ min: 100, max: 110 });
  });

  it('widens a line that barely moved, around its middle', () => {
    const { min, max } = priceDomain([0.9999, 1.0001], minSpanFor('USDC'));
    expect(max - min).toBeCloseTo(0.1);
    expect((min + max) / 2).toBeCloseTo(1);
  });

  it('draws a digital dollar against a wider range than a coin', () => {
    expect(minSpanFor('USDC')).toBeGreaterThan(minSpanFor('BTC'));
    expect(minSpanFor('usdc')).toBe(minSpanFor('USDC'));
  });

  it('never divides by nothing', () => {
    expect(priceDomain([])).toEqual({ min: 0, max: 1 });
    const { min, max } = priceDomain([0, 0]);
    expect(max).toBeGreaterThan(min);
  });
});

import { it, expect, describe } from '@jest/globals';

import {
  TOP_3,
  INDEXES,
  indexById,
  indexBySlug,
  basketChange,
  basketSeries,
  basketHistory,
} from './indexes';

import type { IndexCoinMarket } from './indexes';

describe('the index registry', () => {
  it('finds an index by its address and by the id its purchases store', () => {
    expect(indexBySlug('top-3')).toBe(TOP_3);
    expect(indexById('crypto-3')).toBe(TOP_3);
    expect(indexBySlug('nope')).toBeNull();
    expect(indexById(undefined)).toBeNull();
  });
  it('every slug and id is unique', () => {
    expect(new Set(INDEXES.map((i) => i.slug)).size).toBe(INDEXES.length);
    expect(new Set(INDEXES.map((i) => i.id)).size).toBe(INDEXES.length);
  });
});

// Market caps 600 / 300 / 100 (60 / 30 / 10 by size), prices 100 / 10 / 1, so
// the coin counts are 6, 30 and 100.
const market = (price: number, marketCap: number, extra: Partial<IndexCoinMarket> = {}) => ({
  price,
  marketCap,
  change24h: 0,
  sparkline24h: [price, price],
  ...extra,
});
const MARKETS: Record<string, IndexCoinMarket> = {
  BTC: market(100, 600),
  ETH: market(10, 300),
  SOL: market(1, 100),
};

describe('basketChange: the coins’ combined size, now against a day ago', () => {
  it('is the market-cap weighted move, by each coin’s size a day ago', () => {
    const changes: Record<string, number> = { BTC: 20, ETH: -25, SOL: 0 };
    const of = (s: string) => ({ ...MARKETS[s], change24h: changes[s] });
    // a day ago: 600 / 1.2 + 300 / 0.75 + 100 = 1000; now 1000: no move
    expect(basketChange(TOP_3.def, of)).toBeCloseTo(0, 10);
    const up = (s: string) => ({ ...MARKETS[s], change24h: s === 'SOL' ? 100 : 0 });
    // a day ago: 600 + 300 + 50 = 950; now 1000
    expect(basketChange(TOP_3.def, up)).toBeCloseTo((1000 / 950 - 1) * 100, 10);
  });
  it('says nothing when a coin’s change or size is unknown', () => {
    expect(
      basketChange(TOP_3.def, (s) => ({ ...MARKETS[s], change24h: s === 'SOL' ? null : 1 }))
    ).toBeNull();
    expect(
      basketChange(TOP_3.def, (s) => ({ ...MARKETS[s], marketCap: s === 'SOL' ? null : 1 }))
    ).toBeNull();
  });
});

describe('basketSeries: the last day, from 100', () => {
  it('follows the coins’ combined size', () => {
    const lines: Record<string, number[]> = { BTC: [100, 110], ETH: [10, 10], SOL: [1, 2] };
    const s = basketSeries(TOP_3.def, (sym) => ({ ...MARKETS[sym], sparkline24h: lines[sym] }));
    expect(s[0]).toBeCloseTo(100, 10);
    // sizes: 6 * 100 + 30 * 10 + 100 * 1 = 1000, then 660 + 300 + 200 = 1160
    expect(s[1]).toBeCloseTo(116, 10);
  });
  it('lines up series of different lengths on now', () => {
    const lines: Record<string, number[]> = {
      BTC: [1, 100, 100, 200],
      ETH: [10, 10, 10],
      SOL: [1, 1, 1],
    };
    const s = basketSeries(TOP_3.def, (sym) => ({ ...MARKETS[sym], sparkline24h: lines[sym] }));
    expect(s).toHaveLength(3);
    // 1000 → 600 + 600 more from Bitcoin doubling = 1600
    expect(s[2]).toBeCloseTo(160, 10);
  });
  it('is empty when a coin has no line or no size', () => {
    expect(
      basketSeries(TOP_3.def, (sym) => ({
        ...MARKETS[sym],
        sparkline24h: sym === 'SOL' ? [] : [1, 2],
      }))
    ).toEqual([]);
    expect(
      basketSeries(TOP_3.def, (sym) => ({ ...MARKETS[sym], marketCap: sym === 'SOL' ? null : 5 }))
    ).toEqual([]);
  });
});

describe('basketHistory: a chosen range, from 100', () => {
  const at = (minutes: number) => Date.UTC(2026, 10, 10, 12, minutes);

  it('reads every coin on the first coin’s moments, at its latest price', () => {
    const history: Record<string, [number, number][]> = {
      BTC: [
        [at(0), 100],
        [at(5), 100],
        [at(10), 200],
      ],
      // a few seconds later than Bitcoin's moments
      ETH: [
        [at(0) + 4000, 10],
        [at(5) + 4000, 20],
        [at(10) + 4000, 20],
      ],
      SOL: [
        [at(0) - 1000, 1],
        [at(10) - 1000, 1],
      ],
    };
    const line = basketHistory(
      TOP_3.def,
      (s) => MARKETS[s],
      (s) => history[s]
    );
    // at(0): Ethereum has no price yet, so the line starts at at(5)
    expect(line.map(([ts]) => ts)).toEqual([at(5), at(10)]);
    // at(5): 6 * 100 + 30 * 10 (its at(0)+4s price) + 100 = 1000
    // at(10): 6 * 200 + 30 * 20 + 100 = 1900
    expect(line[0][1]).toBeCloseTo(100, 10);
    expect(line[1][1]).toBeCloseTo(190, 10);
  });

  it('is empty when a coin has no line or no size', () => {
    const two: [number, number][] = [
      [at(0), 1],
      [at(5), 1],
    ];
    expect(
      basketHistory(
        TOP_3.def,
        (s) => MARKETS[s],
        (s) => (s === 'SOL' ? [] : two)
      )
    ).toEqual([]);
    expect(
      basketHistory(
        TOP_3.def,
        (s) => ({ ...MARKETS[s], price: s === 'SOL' ? 0 : 1 }),
        () => two
      )
    ).toEqual([]);
  });
});

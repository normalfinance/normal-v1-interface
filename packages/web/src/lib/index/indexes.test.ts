import { it, expect, describe } from '@jest/globals';

import { TOP_3, INDEXES, indexById, indexBySlug, basketChange, basketSeries } from './indexes';

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

describe('basketChange', () => {
  it('weights each coin’s change by its share', () => {
    const changes: Record<string, number> = { BTC: 1, ETH: -2, SOL: 4 };
    // 0.6 * 1 + 0.25 * -2 + 0.15 * 4 = 0.7
    expect(basketChange(TOP_3.def, (s) => changes[s])).toBeCloseTo(0.7, 10);
  });
  it('says nothing when a coin’s change is unknown', () => {
    expect(basketChange(TOP_3.def, (s) => (s === 'SOL' ? null : 1))).toBeNull();
  });
});

describe('basketSeries', () => {
  it('starts at 100 and follows the weighted coins', () => {
    const lines: Record<string, number[]> = {
      BTC: [100, 110],
      ETH: [10, 10],
      SOL: [5, 10],
    };
    const s = basketSeries(TOP_3.def, (sym) => lines[sym]);
    expect(s[0]).toBeCloseTo(100, 10);
    // 60 * 1.1 + 25 * 1 + 15 * 2 = 121
    expect(s[1]).toBeCloseTo(121, 10);
  });
  it('lines up series of different lengths on now', () => {
    const s = basketSeries(TOP_3.def, (sym) =>
      sym === 'BTC' ? [1, 1, 1, 2] : sym === 'ETH' ? [1, 1, 1] : [1, 1, 1]
    );
    expect(s).toHaveLength(3);
    expect(s[2]).toBeCloseTo(160, 10);
  });
  it('is empty when a coin has no line', () => {
    expect(basketSeries(TOP_3.def, (sym) => (sym === 'SOL' ? [] : [1, 2]))).toEqual([]);
  });
});

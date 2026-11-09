import { it, expect, describe } from '@jest/globals';

import {
  weightLabel,
  CRYPTO_INDEX,
  splitPurchase,
  assertIndexDef,
  purchaseVerdict,
  minimumPurchaseWire,
  INDEX_MIN_SLICE_USD,
} from './basket';

const usd = (n: number) => BigInt(Math.round(n * 1_000_000));

describe('the crypto index', () => {
  it('is Bitcoin, Ethereum and Solana, biggest slice first, summing to 100%', () => {
    expect(CRYPTO_INDEX.legs.map((l) => l.symbol)).toEqual(['BTC', 'ETH', 'SOL']);
    expect(() => assertIndexDef(CRYPTO_INDEX)).not.toThrow();
    const w = CRYPTO_INDEX.legs.map((l) => l.weightBps);
    expect(w).toEqual([...w].sort((a, b) => b - a));
  });

  it('refuses a broken definition', () => {
    expect(() => assertIndexDef({ id: 'x', legs: [] })).toThrow();
    expect(() => assertIndexDef({ id: 'x', legs: [{ symbol: 'BTC', weightBps: 9000 }] })).toThrow(
      /9000/
    );
    expect(() =>
      assertIndexDef({
        id: 'x',
        legs: [
          { symbol: 'BTC', weightBps: 5000 },
          { symbol: 'BTC', weightBps: 5000 },
        ],
      })
    ).toThrow(/twice/);
    expect(() =>
      assertIndexDef({
        id: 'x',
        legs: [
          { symbol: 'BTC', weightBps: 10000.5 },
          { symbol: 'ETH', weightBps: -0.5 },
        ],
      })
    ).toThrow();
  });
});

describe('splitPurchase', () => {
  it('splits $100 as 60 / 25 / 15', () => {
    expect(splitPurchase(usd(100)).map((s) => s.amountWire)).toEqual([usd(60), usd(25), usd(15)]);
  });

  it('always adds up to the purchase, to the last unit, the remainder going to Bitcoin', () => {
    for (const total of [1n, 7n, 999_999n, 66_666_667n, 123_456_789n, 10_000_000_001n]) {
      const slices = splitPurchase(total);
      expect(slices.reduce((s, x) => s + x.amountWire, 0n)).toBe(total);
      // every slice is its weight rounded down, except Bitcoin's which holds the rest
      slices.slice(1).forEach((s) => {
        expect(s.amountWire).toBe((total * BigInt(s.weightBps)) / 10_000n);
      });
    }
  });

  it('never splits nothing', () => {
    expect(() => splitPurchase(0n)).toThrow();
    expect(() => splitPurchase(-1n)).toThrow();
  });
});

describe('minimumPurchaseWire', () => {
  it('is $67 for 60 / 25 / 15, and every slice of it reaches the slice minimum', () => {
    const min = minimumPurchaseWire();
    expect(min).toBe(usd(67));
    for (const s of splitPurchase(min)) {
      expect(s.amountWire).toBeGreaterThanOrEqual(usd(INDEX_MIN_SLICE_USD));
    }
    // a dollar less would leave Solana's slice under $10
    const below = splitPurchase(min - usd(1));
    expect(below.some((s) => s.amountWire < usd(INDEX_MIN_SLICE_USD))).toBe(true);
  });
});

describe('purchaseVerdict', () => {
  it('too small, too large, or the slices', () => {
    expect(purchaseVerdict(usd(50), null)).toEqual({
      ok: false,
      reason: 'too-small',
      minimumWire: usd(67),
    });
    expect(purchaseVerdict(usd(500), usd(300))).toEqual({
      ok: false,
      reason: 'too-large',
      maximumWire: usd(300),
    });
    const ok = purchaseVerdict(usd(300), usd(300));
    expect(ok.ok).toBe(true);
  });
});

it('weightLabel', () => {
  expect(weightLabel(6000)).toBe('60%');
  expect(weightLabel(1250)).toBe('12.5%');
});

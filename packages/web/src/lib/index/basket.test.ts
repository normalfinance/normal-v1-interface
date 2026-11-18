import { it, expect, describe } from '@jest/globals';

import {
  weightLabel,
  CRYPTO_INDEX,
  parseWeights,
  marketWeights,
  splitPurchase,
  weightsWithin,
  purchaseVerdict,
  assertIndexWeights,
  minimumPurchaseWire,
  INDEX_MIN_SLICE_USD,
  WEIGHT_TOLERANCE_BPS,
} from './basket';

import type { IndexWeight } from './basket';

const usd = (n: number) => BigInt(Math.round(n * 1_000_000));

// Market caps in dollars, roughly November 2026.
const CAPS: Record<string, number> = { BTC: 1.74e12, ETH: 306.7e9, SOL: 82.1e9 };
const W = marketWeights(CRYPTO_INDEX, (s) => CAPS[s]) as IndexWeight[];

describe('the crypto index', () => {
  it('is Bitcoin, Ethereum and Solana', () => {
    expect(CRYPTO_INDEX.coins).toEqual(['BTC', 'ETH', 'SOL']);
  });
});

describe('marketWeights: each coin its share of the combined market size', () => {
  it('follows the market caps, biggest first, in whole points summing to 100%', () => {
    expect(W.map((w) => w.symbol)).toEqual(['BTC', 'ETH', 'SOL']);
    expect(W.reduce((sum, w) => sum + w.weightBps, 0)).toBe(10_000);
    const total = CAPS.BTC + CAPS.ETH + CAPS.SOL;
    for (const w of W) {
      // within one point of the exact share
      expect(Math.abs(w.weightBps - (CAPS[w.symbol] / total) * 10_000)).toBeLessThan(1);
    }
    expect(() => assertIndexWeights(W)).not.toThrow();
  });

  it('hands the points rounding leaves over to the largest remainders', () => {
    // Thirds: 3333.33 each, one point over, to the first of the tied coins.
    const thirds = marketWeights(CRYPTO_INDEX, () => 1) as IndexWeight[];
    expect(thirds.map((w) => w.weightBps).sort()).toEqual([3333, 3333, 3334]);
  });

  it('never guesses a share: an unknown, zero or broken market cap answers null', () => {
    expect(marketWeights(CRYPTO_INDEX, (s) => (s === 'SOL' ? null : 1))).toBeNull();
    expect(marketWeights(CRYPTO_INDEX, (s) => (s === 'SOL' ? 0 : 1))).toBeNull();
    expect(marketWeights(CRYPTO_INDEX, (s) => (s === 'SOL' ? Number.NaN : 1))).toBeNull();
    expect(marketWeights({ id: 'x', coins: [] }, () => 1)).toBeNull();
  });

  it('keeps a dust coin in at one point, taken from the biggest', () => {
    const w = marketWeights(CRYPTO_INDEX, (s) => (s === 'SOL' ? 1 : 1e12)) as IndexWeight[];
    expect(w.find((x) => x.symbol === 'SOL')?.weightBps).toBe(1);
    expect(w.reduce((sum, x) => sum + x.weightBps, 0)).toBe(10_000);
  });
});

describe('assertIndexWeights', () => {
  it('refuses broken shares', () => {
    expect(() => assertIndexWeights([])).toThrow();
    expect(() => assertIndexWeights([{ symbol: 'BTC', weightBps: 9000 }])).toThrow(/9000/);
    expect(() =>
      assertIndexWeights([
        { symbol: 'BTC', weightBps: 5000 },
        { symbol: 'BTC', weightBps: 5000 },
      ])
    ).toThrow(/twice/);
    expect(() =>
      assertIndexWeights([
        { symbol: 'BTC', weightBps: 10000.5 },
        { symbol: 'ETH', weightBps: -0.5 },
      ])
    ).toThrow();
  });
});

describe('parseWeights: shares a client sent, read strictly', () => {
  it('takes the index coins in whole points summing to 10,000, biggest first', () => {
    expect(
      parseWeights(CRYPTO_INDEX, [
        { symbol: 'SOL', weightBps: 386 },
        { symbol: 'BTC', weightBps: 8174 },
        { symbol: 'ETH', weightBps: 1440 },
      ])
    ).toEqual([
      { symbol: 'BTC', weightBps: 8174 },
      { symbol: 'ETH', weightBps: 1440 },
      { symbol: 'SOL', weightBps: 386 },
    ]);
  });

  it('refuses anything else', () => {
    const good = W.map((w) => ({ ...w }));
    expect(parseWeights(CRYPTO_INDEX, 'all of it')).toBeNull();
    expect(parseWeights(CRYPTO_INDEX, good.slice(0, 2))).toBeNull();
    expect(
      parseWeights(CRYPTO_INDEX, [...good.slice(0, 2), { symbol: 'XLM', weightBps: 386 }])
    ).toBeNull();
    expect(
      parseWeights(CRYPTO_INDEX, [
        { symbol: 'BTC', weightBps: 9000 },
        { symbol: 'ETH', weightBps: 900 },
        { symbol: 'SOL', weightBps: '100' },
      ])
    ).toBeNull();
    expect(
      parseWeights(CRYPTO_INDEX, [
        { symbol: 'BTC', weightBps: 9000 },
        { symbol: 'ETH', weightBps: 900 },
        { symbol: 'SOL', weightBps: 99 },
      ])
    ).toBeNull();
  });
});

describe('weightsWithin', () => {
  it('a point either way per coin is the same review; more is not', () => {
    const moved = W.map((w, i) => ({
      ...w,
      weightBps:
        w.weightBps + (i === 0 ? -WEIGHT_TOLERANCE_BPS : i === 1 ? WEIGHT_TOLERANCE_BPS : 0),
    }));
    expect(weightsWithin(moved, W, WEIGHT_TOLERANCE_BPS)).toBe(true);
    const tooFar = W.map((w, i) => ({
      ...w,
      weightBps: w.weightBps + (i === 0 ? -101 : i === 1 ? 101 : 0),
    }));
    expect(weightsWithin(tooFar, W, WEIGHT_TOLERANCE_BPS)).toBe(false);
    expect(weightsWithin(W.slice(0, 2), W, WEIGHT_TOLERANCE_BPS)).toBe(false);
  });
});

describe('splitPurchase', () => {
  const sixty: IndexWeight[] = [
    { symbol: 'BTC', weightBps: 6000 },
    { symbol: 'ETH', weightBps: 2500 },
    { symbol: 'SOL', weightBps: 1500 },
  ];

  it('splits $100 by the shares', () => {
    expect(splitPurchase(usd(100), sixty).map((s) => s.amountWire)).toEqual([
      usd(60),
      usd(25),
      usd(15),
    ]);
  });

  it('always adds up to the purchase, to the last unit, the remainder going to the biggest', () => {
    for (const total of [1n, 7n, 999_999n, 66_666_667n, 123_456_789n, 10_000_000_001n]) {
      const slices = splitPurchase(total, W);
      expect(slices.reduce((s, x) => s + x.amountWire, 0n)).toBe(total);
      slices.slice(1).forEach((s) => {
        expect(s.amountWire).toBe((total * BigInt(s.weightBps)) / 10_000n);
      });
    }
  });

  it('never splits nothing', () => {
    expect(() => splitPurchase(0n, W)).toThrow();
    expect(() => splitPurchase(-1n, W)).toThrow();
  });
});

describe('minimumPurchaseWire: the smallest coin sets it', () => {
  it('is $67 when the smallest holds 15%', () => {
    expect(
      minimumPurchaseWire([
        { symbol: 'BTC', weightBps: 6000 },
        { symbol: 'ETH', weightBps: 2500 },
        { symbol: 'SOL', weightBps: 1500 },
      ])
    ).toBe(usd(67));
  });

  it('by market size, every slice of it reaches the slice minimum, a dollar less does not', () => {
    const min = minimumPurchaseWire(W);
    const sol = W.find((w) => w.symbol === 'SOL')!.weightBps;
    // whole dollars, rounded up: $260 when Solana holds 3.86%
    expect(min).toBe(usd(Math.ceil((INDEX_MIN_SLICE_USD * 10_000) / sol)));
    for (const s of splitPurchase(min, W)) {
      expect(s.amountWire).toBeGreaterThanOrEqual(usd(INDEX_MIN_SLICE_USD));
    }
    const below = splitPurchase(min - usd(1), W);
    expect(below.some((s) => s.amountWire < usd(INDEX_MIN_SLICE_USD))).toBe(true);
  });
});

describe('purchaseVerdict', () => {
  it('too small, too large, or the slices', () => {
    const min = minimumPurchaseWire(W);
    expect(purchaseVerdict(min - usd(1), null, W)).toEqual({
      ok: false,
      reason: 'too-small',
      minimumWire: min,
    });
    expect(purchaseVerdict(usd(5000), usd(3000), W)).toEqual({
      ok: false,
      reason: 'too-large',
      maximumWire: usd(3000),
    });
    expect(purchaseVerdict(usd(3000), usd(3000), W).ok).toBe(true);
  });
});

it('weightLabel', () => {
  expect(weightLabel(6000)).toBe('60%');
  expect(weightLabel(1250)).toBe('12.5%');
  expect(weightLabel(8174)).toBe('81.7%');
});

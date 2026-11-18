import { niceTicks, axisTicks, decimalsOf } from './axis';

const labels = (ticks: { label: string }[]) => ticks.map((t) => t.label);

describe('niceTicks: round values across a range', () => {
  it('a week of Bitcoin: every thousand dollars', () => {
    expect(niceTicks(94210, 99870, 4)).toEqual({
      values: [95000, 96000, 97000, 98000, 99000],
      step: 1000,
    });
  });

  it('keeps to the range: no value outside lo and hi', () => {
    const nice = niceTicks(2971.4, 3028.9, 4)!;
    expect(nice.values.every((v) => v >= 2971.4 && v <= 3028.9)).toBe(true);
    expect(nice.values).toEqual([2980, 3000, 3020]);
  });

  it('a range on a round value includes it', () => {
    expect(niceTicks(0.95, 1.05, 4)!.values).toEqual([0.95, 1, 1.05]);
  });

  it('decimal steps carry no float dust', () => {
    const nice = niceTicks(0.2512, 0.3391, 4)!;
    expect(nice.values).toEqual([0.26, 0.28, 0.3, 0.32]);
    expect(nice.values.map(String).every((s) => s.length <= 4)).toBe(true);
  });

  it('never more than five, never fewer than two', () => {
    for (const [lo, hi] of [
      [1, 1.0001],
      [0, 1e9],
      [-3.2, 7.9],
      [99999, 100001],
      [12.3, 98.7],
    ]) {
      const n = niceTicks(lo, hi, 4)!.values.length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('a smaller target gives fewer', () => {
    expect(niceTicks(94210, 99870, 2)!.values).toEqual([96000, 98000]);
  });

  it('no range, no scale', () => {
    expect(niceTicks(5, 5)).toBeNull();
    expect(niceTicks(6, 5)).toBeNull();
    expect(niceTicks(NaN, 5)).toBeNull();
  });
});

describe('decimalsOf', () => {
  it('counts what a step needs', () => {
    expect(decimalsOf(500)).toBe(0);
    expect(decimalsOf(25)).toBe(0);
    expect(decimalsOf(0.5)).toBe(1);
    expect(decimalsOf(0.05)).toBe(2);
    expect(decimalsOf(0.0025)).toBe(4);
  });
});

describe('axisTicks: the scale in words (Niko 2026-11-10)', () => {
  const usd = (lo: number, hi: number) => labels(axisTicks({ lo, hi, first: lo, kind: 'usd' }));

  it('dollars in full, the way the price above the line prints them', () => {
    expect(usd(94210, 99870)).toEqual(['$95,000', '$96,000', '$97,000', '$98,000', '$99,000']);
    expect(usd(3112, 3488)).toEqual(['$3,200', '$3,300', '$3,400']);
  });

  it('cents under a dollar, and a digital dollar reads as one', () => {
    expect(usd(0.2512, 0.3391)).toEqual(['$0.26', '$0.28', '$0.30', '$0.32']);
    expect(usd(0.95, 1.05)).toEqual(['$0.95', '$1.00', '$1.05']);
  });

  it('every label on a scale is different', () => {
    for (const [lo, hi] of [
      [94210, 99870],
      [0.2512, 0.3391],
      [0.9996, 1.0004],
      [148.2, 151.9],
    ]) {
      const words = usd(lo, hi);
      expect(new Set(words).size).toBe(words.length);
    }
  });

  it('in the page language: German dollars', () => {
    const ticks = axisTicks({ lo: 94210, hi: 99870, first: 94210, kind: 'usd', locale: 'de-DE' });
    expect(ticks[0].label.replace(/\s/g, ' ')).toBe('95.000 $');
  });

  it('an index reads as its move since the range opened, 0% where it opened', () => {
    const ticks = axisTicks({ lo: 97.6, hi: 106.2, first: 100, kind: 'change' });
    expect(labels(ticks)).toEqual(['−2%', '0%', '+2%', '+4%', '+6%']);
    // Each sits at the value that move means.
    expect(ticks[2].value).toBeCloseTo(102);
    const down = axisTicks({ lo: 88.3, hi: 101.2, first: 100, kind: 'change' });
    expect(labels(down)).toEqual(['−10%', '−5%', '0%']);
  });

  it('a move scale from any opening value, not just 100', () => {
    const ticks = axisTicks({ lo: 2850, hi: 3150, first: 3000, kind: 'change' });
    expect(labels(ticks)).toContain('0%');
    const zero = ticks.find((t) => t.label === '0%')!;
    expect(zero.value).toBeCloseTo(3000);
  });

  it('nothing to scale without a range or an opening value', () => {
    expect(axisTicks({ lo: 1, hi: 1, first: 1, kind: 'usd' })).toEqual([]);
    expect(axisTicks({ lo: 1, hi: 2, first: 0, kind: 'change' })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The scale beside a history line (Niko 2026-11-10: "why does no graph have y
// axis values"): a few round values across the line's own range, so the line
// reads without pointing at it. The dataviz rule: an axis carries the values
// the chart doesn't label, so a line with only its high and low marked keeps
// one.
//
// Dollars print in full, the way the price above the line does ("$96,500").
// The short forms Intl offers are not an axis in every language: German keeps
// thousands long ("96.500,0 $") and Japanese counts in ten-thousands, printing
// 96,500 and 97,000 as "$9.7万" and "$10万", two ticks a scale apart. Pure, so
// it is tested.
// ---------------------------------------------------------------------------

/** How a scale reads: dollars (a price), or the move since the range opened (an index). */
export type AxisKind = 'usd' | 'change';

export interface AxisTick {
  /** Where it sits, in the line's own values. */
  value: number;
  /** "$96,500", "+2%". */
  label: string;
}

/** The decimals a step needs to print exactly: 0.25 is 2, 500 is 0. */
export function decimalsOf(step: number): number {
  for (let digits = 0; digits < 10; digits += 1) {
    const scaled = step * Math.pow(10, digits);
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6 * Math.max(1, Math.abs(scaled))) return digits;
  }
  return 10;
}

/**
 * Round values from `lo` to `hi`, near `target` of them (2 to 5): every
 * multiple of a step of 1, 2 or 5 times a power of ten (2.5 too from 25 up,
 * where it needs no more decimals than its power), the count closest to the
 * target winning, fewer before more. Null when there is no range to scale.
 */
export function niceTicks(
  lo: number,
  hi: number,
  target = 4
): { values: number[]; step: number } | null {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !(hi > lo)) return null;
  const power = Math.floor(Math.log10(hi - lo));
  let best: { values: number[]; step: number; score: number } | null = null;
  for (let p = power - 2; p <= power + 1; p += 1) {
    for (const m of [1, 2, 2.5, 5]) {
      if (m === 2.5 && p < 1) continue;
      const step = m * Math.pow(10, p);
      const from = Math.ceil(lo / step - 1e-9);
      const to = Math.floor(hi / step + 1e-9);
      const count = to - from + 1;
      if (count < 2 || count > 5) continue;
      const score = Math.abs(count - target) + (count > target ? 0.25 : 0) + (m === 2.5 ? 0.5 : 0);
      if (!best || score < best.score) {
        const values = Array.from({ length: count }, (_, i) =>
          // Multiples of a decimal step carry float dust (0.30000000000000004).
          Number(((from + i) * step).toPrecision(12))
        );
        best = { values, step, score };
      }
    }
  }
  return best && { values: best.values, step: best.step };
}

/** "+2%", "0%", "−1.5%": the app's signed percent, at the decimals its step needs. */
const signedPercent = (pct: number, digits: number) =>
  `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(digits)}%`;

/**
 * The ticks of a line's scale between `lo` and `hi`, in its own values. In
 * dollars, whole dollars for a step of a dollar or more, cents (or finer, as
 * the step needs) under it; as a move, round percents from `first`, the
 * range's opening value, which is always one of them (0%).
 */
export function axisTicks({
  lo,
  hi,
  first,
  kind,
  target = 4,
  locale = 'en-US',
}: {
  lo: number;
  hi: number;
  first: number;
  kind: AxisKind;
  target?: number;
  locale?: string;
}): AxisTick[] {
  if (kind === 'change') {
    if (!(first > 0)) return [];
    const moved = (value: number) => (value / first - 1) * 100;
    const nice = niceTicks(moved(lo), moved(hi), target);
    if (!nice) return [];
    const digits = decimalsOf(nice.step);
    return nice.values.map((pct) => ({
      value: first * (1 + pct / 100),
      label: signedPercent(pct, digits),
    }));
  }
  const nice = niceTicks(lo, hi, target);
  if (!nice) return [];
  const decimals = decimalsOf(nice.step);
  const digits = decimals === 0 ? 0 : Math.max(2, decimals);
  const format = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return nice.values.map((value) => ({ value, label: format.format(value) }));
}

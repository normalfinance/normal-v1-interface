import { it, expect, describe } from '@jest/globals';

import { buildRealEarningsHistory } from './earnings-history';

// Pins the #53 contract: earnings distributed by REAL balance×time, exact at
// both ends, no APY shape anywhere.

const DAY = 24 * 3600 * 1000;
const T0 = 1_700_000_000_000;

describe('buildRealEarningsHistory', () => {
  it('single deposit → linear ramp from 0 to the true earnings', () => {
    const pts = buildRealEarningsHistory(
      [{ type: 'deposit', amount: 100, timestamp: T0 }],
      10,
      T0 + 10 * DAY,
      11
    );
    expect(pts[0].v).toBe(0);
    expect(pts[10].v).toBeCloseTo(10, 6);
    expect(pts[5].v).toBeCloseTo(5, 6); // constant balance → linear accrual
  });

  it('doubling the balance mid-way doubles the accrual slope', () => {
    const pts = buildRealEarningsHistory(
      [
        { type: 'deposit', amount: 100, timestamp: T0 },
        { type: 'deposit', amount: 100, timestamp: T0 + 10 * DAY },
      ],
      30,
      T0 + 20 * DAY,
      21
    );
    // weights: 100/day for 10 days (1000) + 200/day for 10 days (2000) = 3000
    expect(pts[10].v).toBeCloseTo(30 * (1000 / 3000), 4); // $10 at the midpoint
    expect(pts[20].v).toBeCloseTo(30, 6);
  });

  it('withdraw-all freezes the curve flat afterwards', () => {
    const pts = buildRealEarningsHistory(
      [
        { type: 'deposit', amount: 100, timestamp: T0 },
        { type: 'withdraw', amount: 100, timestamp: T0 + 10 * DAY },
      ],
      12,
      T0 + 20 * DAY,
      21
    );
    expect(pts[10].v).toBeCloseTo(12, 4);
    expect(pts[15].v).toBeCloseTo(12, 4); // no balance → no further accrual
    expect(pts[20].v).toBeCloseTo(12, 4);
  });

  it('no events or zero elapsed → empty (never a fabricated curve)', () => {
    expect(buildRealEarningsHistory([], 5, T0)).toEqual([]);
    expect(
      buildRealEarningsHistory([{ type: 'deposit', amount: 1, timestamp: T0 }], 5, T0)
    ).toEqual([]);
  });
});

import { it, expect, describe } from '@jest/globals';

import { EASE, ease, easeAt } from './motion';

describe('the one curve', () => {
  it('is written once for CSS', () => {
    expect(EASE).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(ease('opacity')).toBe(`opacity 300ms ${EASE}`);
    expect(ease(['background-color', 'color'], 'quick')).toBe(
      `background-color 180ms ${EASE}, color 180ms ${EASE}`
    );
    expect(ease('opacity', 'reveal', 120)).toBe(`opacity 800ms ${EASE} 120ms`);
  });

  it('starts at rest and ends at rest', () => {
    expect(easeAt(0)).toBeCloseTo(0, 6);
    expect(easeAt(1)).toBeCloseTo(1, 6);
    expect(easeAt(-1)).toBeCloseTo(0, 6);
    expect(easeAt(2)).toBeCloseTo(1, 6);
  });

  it('is an ease-out: most of the way there early, never past it, never back', () => {
    expect(easeAt(0.25)).toBeGreaterThan(0.6);
    expect(easeAt(0.5)).toBeGreaterThan(0.85);
    let last = 0;
    for (let i = 1; i <= 100; i += 1) {
      const y = easeAt(i / 100);
      expect(y).toBeGreaterThanOrEqual(last);
      expect(y).toBeLessThanOrEqual(1);
      last = y;
    }
  });
});

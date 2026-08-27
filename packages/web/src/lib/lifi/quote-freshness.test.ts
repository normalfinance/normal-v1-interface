import { driftVerdict, isQuoteStale, QUOTE_STALE_MS, MATERIAL_DRIFT } from './quote-freshness';

describe('isQuoteStale', () => {
  it('lets a fresh quote through', () => {
    expect(isQuoteStale(0)).toBe(false);
    expect(isQuoteStale(60_000)).toBe(false);
    expect(isQuoteStale(QUOTE_STALE_MS - 1)).toBe(false);
  });

  it('stops a quote that has sat past the window', () => {
    expect(isQuoteStale(QUOTE_STALE_MS)).toBe(true);
    expect(isQuoteStale(45 * 60_000)).toBe(true);
  });

  it('treats an unknown age as stale, never as fresh', () => {
    // The dangerous default: a missing timestamp must not read as "just now".
    expect(isQuoteStale(NaN)).toBe(true);
    expect(isQuoteStale(Infinity)).toBe(true);
  });
});

describe('driftVerdict', () => {
  it('accepts an unchanged price', () => {
    expect(driftVerdict('0.0042', '0.0042')).toBe('ok');
  });

  it('accepts a BETTER price without interrupting the user', () => {
    expect(driftVerdict('0.0042', '0.0043')).toBe('ok');
  });

  it('accepts movement inside the tolerance', () => {
    // 0.5% worse — ordinary movement, re-price silently.
    expect(driftVerdict('100', '99.5')).toBe('ok');
  });

  it('asks when the output drops materially', () => {
    // 2% worse — a different deal from the one on screen.
    expect(driftVerdict('100', '98')).toBe('worse');
  });

  it('puts the boundary just past the tolerance, not on it', () => {
    const atLimit = BigNumberish(100, 1 - MATERIAL_DRIFT); // exactly 1% worse
    expect(driftVerdict('100', atLimit)).toBe('ok');
    expect(driftVerdict('100', '98.9')).toBe('worse');
  });

  it('asks whenever the two cannot be compared', () => {
    // No number, a zero baseline or junk means we do not KNOW it is fine —
    // and "we do not know" must never resolve to "go ahead".
    expect(driftVerdict(null, '1')).toBe('worse');
    expect(driftVerdict('1', undefined)).toBe('worse');
    expect(driftVerdict('0', '0')).toBe('worse');
    expect(driftVerdict('abc', '1')).toBe('worse');
  });
});

function BigNumberish(base: number, factor: number): string {
  return String(base * factor);
}

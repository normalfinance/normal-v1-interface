import {
  autofinishAhead,
  autofinishDecision,
  AUTOFINISH_MIN_AGE_MS,
  AUTOFINISH_MAX_AGE_MS,
  AUTOFINISH_MAX_ATTEMPTS,
} from './autofinish';

const MIN = AUTOFINISH_MIN_AGE_MS;
const MAX = AUTOFINISH_MAX_AGE_MS;

describe('autofinishDecision — when the cron may finish an inbound burn', () => {
  it('attempts an abandoned transfer inside the window', () => {
    expect(autofinishDecision({ ageMs: 37 * 60_000, retryCount: 0 })).toEqual({
      attempt: true,
      reason: 'eligible',
    });
  });

  it('leaves fresh rows to the live tab — an open session must never be raced', () => {
    expect(autofinishDecision({ ageMs: MIN - 1, retryCount: 0 }).attempt).toBe(false);
    expect(autofinishDecision({ ageMs: MIN, retryCount: 0 }).attempt).toBe(true);
  });

  it('never surprise-fires an old burn — the week-old ghost stays banner-only', () => {
    expect(autofinishDecision({ ageMs: MAX + 1, retryCount: 0 }).attempt).toBe(false);
    expect(autofinishDecision({ ageMs: 7 * 24 * 3_600_000, retryCount: 0 }).attempt).toBe(false);
  });

  it('gives up after the attempt cap — a non-autopilot user is a permanent no, not a retry loop', () => {
    expect(
      autofinishDecision({ ageMs: 60 * 60_000, retryCount: AUTOFINISH_MAX_ATTEMPTS }).attempt
    ).toBe(false);
    expect(
      autofinishDecision({ ageMs: 60 * 60_000, retryCount: AUTOFINISH_MAX_ATTEMPTS - 1 }).attempt
    ).toBe(true);
  });

  it('refuses a nonsensical age instead of guessing', () => {
    expect(autofinishDecision({ ageMs: -5, retryCount: 0 }).attempt).toBe(false);
    expect(autofinishDecision({ ageMs: Number.NaN, retryCount: 0 }).attempt).toBe(false);
  });
});

describe('autofinishAhead: will the server still finish it (Niko 2026-11-10)', () => {
  it('a fresh row is still ahead of it: the cron tries once the live tab has had its minutes', () => {
    expect(autofinishAhead({ ageMs: 0, retryCount: 0 })).toBe(true);
    expect(autofinishAhead({ ageMs: MIN - 1, retryCount: 0 })).toBe(true);
    expect(autofinishAhead({ ageMs: MAX, retryCount: 0 })).toBe(true);
  });

  it("past the age or attempt limit it is the person's to finish", () => {
    expect(autofinishAhead({ ageMs: MAX + 1, retryCount: 0 })).toBe(false);
    expect(autofinishAhead({ ageMs: MIN, retryCount: AUTOFINISH_MAX_ATTEMPTS })).toBe(false);
    expect(autofinishAhead({ ageMs: MIN, retryCount: AUTOFINISH_MAX_ATTEMPTS - 1 })).toBe(true);
  });

  it('agrees with the decision wherever the decision would try', () => {
    for (const ageMs of [MIN, MIN + 1, 60 * 60_000, MAX]) {
      for (const retryCount of [0, 5, AUTOFINISH_MAX_ATTEMPTS - 1, AUTOFINISH_MAX_ATTEMPTS]) {
        if (autofinishDecision({ ageMs, retryCount }).attempt) {
          expect(autofinishAhead({ ageMs, retryCount })).toBe(true);
        }
      }
    }
  });

  it('a nonsensical age is not "ahead"', () => {
    expect(autofinishAhead({ ageMs: -5, retryCount: 0 })).toBe(false);
    expect(autofinishAhead({ ageMs: Number.NaN, retryCount: 0 })).toBe(false);
  });
});

import { FLOOR_WAIT_MS, MAX_REFRESH_ATTEMPTS, shouldRetryPortfolioRead } from './refresh-retry';

const at = (attempt: number, floored: boolean, changed: boolean) =>
  shouldRetryPortfolioRead({ attempt, floored, changed });

describe('shouldRetryPortfolioRead', () => {
  it('stops as soon as a genuinely fresh read shows the new value', () => {
    expect(at(1, false, true)).toBe(false);
  });

  it('retries a fresh read that still shows the old value (chain replica lag)', () => {
    expect(at(1, false, false)).toBe(true);
  });

  it('retries a FLOORED read even when the number changed', () => {
    // The live 2026-08-27 case. Two swaps back to back: the second swap's
    // floored response carried the FIRST swap's data, so the number had moved
    // — and the old "did it change?" test concluded it was done. It was not:
    // nothing fresh had been read at all.
    expect(at(1, true, true)).toBe(true);
  });

  it('retries a floored read that also shows no change', () => {
    expect(at(1, true, false)).toBe(true);
  });

  it('is bounded — never loops against the chain sources', () => {
    // Worst case: every read floored and nothing ever moves.
    expect(at(MAX_REFRESH_ATTEMPTS - 1, true, false)).toBe(true);
    expect(at(MAX_REFRESH_ATTEMPTS, true, false)).toBe(false);
    expect(at(MAX_REFRESH_ATTEMPTS + 1, true, false)).toBe(false);
  });

  it('honours a caller-supplied cap', () => {
    expect(
      shouldRetryPortfolioRead({ attempt: 1, floored: true, changed: false, maxAttempts: 1 })
    ).toBe(false);
  });

  it('waits past the server floor, not up to it', () => {
    // A wait equal to the floor races the expiry and gets floored again.
    expect(FLOOR_WAIT_MS).toBeGreaterThan(5_000);
  });
});

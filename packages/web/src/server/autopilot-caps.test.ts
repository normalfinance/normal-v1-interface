import { capEnabled, evaluateAutopilotCaps } from './autopilot-caps';

const base = { amountUsd: 100, dailySoFar: 0, maxTxUsd: 0, maxDailyUsd: 0 };

describe('autopilot caps', () => {
  it('treats unset/0 as UNLIMITED — the shipped default', () => {
    // Product decision: a user moving $100k/day must not be asked to sign.
    expect(evaluateAutopilotCaps({ ...base, amountUsd: 100_000 }).allowed).toBe(true);
    expect(evaluateAutopilotCaps({ ...base, amountUsd: 5_000_000 }).allowed).toBe(true);
  });

  it('treats a nonsense limit as no limit, never as zero', () => {
    // An env typo must not silently block every swap.
    expect(capEnabled(Number('abc'))).toBe(false);
    expect(capEnabled(-1)).toBe(false);
    expect(
      evaluateAutopilotCaps({ ...base, amountUsd: 999, maxTxUsd: Number('abc') }).allowed
    ).toBe(true);
  });

  it('enforces a per-transaction ceiling when one is configured', () => {
    const v = evaluateAutopilotCaps({ ...base, amountUsd: 2500, maxTxUsd: 2000 });
    expect(v.allowed).toBe(false);
    expect(v.allowed === false && v.reason).toMatch(/per-transaction/);
    expect(evaluateAutopilotCaps({ ...base, amountUsd: 2000, maxTxUsd: 2000 }).allowed).toBe(true);
  });

  it('counts the rolling window against a configured daily ceiling', () => {
    expect(
      evaluateAutopilotCaps({ ...base, amountUsd: 100, dailySoFar: 9950, maxDailyUsd: 10_000 })
        .allowed
    ).toBe(false);
    expect(
      evaluateAutopilotCaps({ ...base, amountUsd: 50, dailySoFar: 9950, maxDailyUsd: 10_000 })
        .allowed
    ).toBe(true);
  });

  it('lets a leg with no measurable value through — the policy still bounds it', () => {
    expect(evaluateAutopilotCaps({ ...base, amountUsd: NaN, maxTxUsd: 10 }).allowed).toBe(true);
  });
});

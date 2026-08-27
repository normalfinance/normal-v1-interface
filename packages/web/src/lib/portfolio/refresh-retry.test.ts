import {
  FLOOR_WAIT_MS,
  nextReadDelayMs,
  balanceSignature,
  REFRESH_BUDGET_MS,
  MIN_RETRY_WAIT_MS,
  canAffordAnotherRead,
  MAX_REFRESH_ATTEMPTS,
  shouldRetryPortfolioRead,
} from './refresh-retry';

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

describe('nextReadDelayMs', () => {
  it('waits a full window when WE just claimed the floor', () => {
    // A real read sets a fresh 5s floor, so the whole window is ahead of us.
    expect(nextReadDelayMs({ floored: false })).toBe(FLOOR_WAIT_MS);
    expect(nextReadDelayMs({ floored: false, retryAfterMs: 400 })).toBe(FLOOR_WAIT_MS);
  });

  it('waits only what the floor has left when the server told us', () => {
    // The 5-10s lag: a read arriving 4.5s into the window used to wait the
    // whole 5.6s again instead of the ~0.8s actually remaining.
    expect(nextReadDelayMs({ floored: true, retryAfterMs: 800 })).toBe(800);
    expect(nextReadDelayMs({ floored: true, retryAfterMs: 2_300 })).toBe(2_300);
  });

  it('never polls faster than the minimum', () => {
    expect(nextReadDelayMs({ floored: true, retryAfterMs: 10 })).toBe(MIN_RETRY_WAIT_MS);
  });

  it('never waits longer than a full window, whatever the hint claims', () => {
    // A stale or wrong hint must not strand the user on an old balance.
    expect(nextReadDelayMs({ floored: true, retryAfterMs: 60_000 })).toBe(FLOOR_WAIT_MS);
  });

  it('falls back to the full window when the hint is missing or junk', () => {
    expect(nextReadDelayMs({ floored: true })).toBe(FLOOR_WAIT_MS);
    expect(nextReadDelayMs({ floored: true, retryAfterMs: null })).toBe(FLOOR_WAIT_MS);
    expect(nextReadDelayMs({ floored: true, retryAfterMs: NaN })).toBe(FLOOR_WAIT_MS);
    expect(nextReadDelayMs({ floored: true, retryAfterMs: -1 })).toBe(FLOOR_WAIT_MS);
  });
});

describe('canAffordAnotherRead', () => {
  it('allows a read that fits inside the budget', () => {
    expect(canAffordAnotherRead(0, 5_600)).toBe(true);
    expect(canAffordAnotherRead(5_600, 800)).toBe(true);
  });

  it('refuses one that would outlive the modal Done gate', () => {
    // Three flat 5.6s waits would exceed the 15s cap the swap modal races
    // this loop against — Done would appear with the balance still catching
    // up, which is the exact symptom this work exists to remove.
    expect(canAffordAnotherRead(11_200, 5_600)).toBe(false);
    expect(canAffordAnotherRead(REFRESH_BUDGET_MS, 0)).toBe(false);
  });

  it('leaves room for the read itself, not just the wait', () => {
    expect(canAffordAnotherRead(REFRESH_BUDGET_MS - 5_600, 5_600)).toBe(false);
  });

  it('refuses on junk timings rather than looping', () => {
    expect(canAffordAnotherRead(NaN, 100)).toBe(false);
    expect(canAffordAnotherRead(0, Infinity)).toBe(false);
  });

  it('stays under the modal cap it exists to respect', () => {
    expect(REFRESH_BUDGET_MS).toBeLessThan(15_000);
  });
});

describe('balanceSignature', () => {
  const PAIR = ['USDC', 'XLM'] as const;
  const a = (symbol: string, balance: string | null) => ({ symbol, balance });

  it('changes when the CONNECTED wallet moves', () => {
    const before = balanceSignature(PAIR, [a('USDC', '28.7'), a('XLM', '5')], null);
    const after = balanceSignature(PAIR, [a('USDC', '27.7'), a('XLM', '10.3')], null);
    expect(after).not.toBe(before);
  });

  it('changes when the COMPANION wallet moves — the live 2026-08-28 bug', () => {
    // The exact shape from the screenshot: the connected Lobstr wallet holds
    // 0.00 and never moves, while the Normal (companion) wallet does the swap.
    // Watching only the first array made "did anything change?" permanently
    // false, so the gate gave up on every swap.
    const lobstr = [a('USDC', '0'), a('XLM', '0')];
    const before = balanceSignature(PAIR, lobstr, [a('USDC', '28.706530'), a('XLM', '5.1')]);
    const after = balanceSignature(PAIR, lobstr, [a('USDC', '27.701530'), a('XLM', '10.397652')]);
    expect(after).not.toBe(before);
  });

  it('is stable when nothing moved', () => {
    const slot = [a('USDC', '1'), a('XLM', '2')];
    const comp = [a('USDC', '3'), a('XLM', '4')];
    expect(balanceSignature(PAIR, slot, comp)).toBe(balanceSignature(PAIR, slot, comp));
  });

  it('keeps the two wallets distinct rather than summing them', () => {
    // Summing would let a rise in one wallet hide a fall in the other.
    const left = balanceSignature(PAIR, [a('USDC', '10')], [a('USDC', '0')]);
    const right = balanceSignature(PAIR, [a('USDC', '0')], [a('USDC', '10')]);
    expect(left).not.toBe(right);
  });

  it('treats missing, null and unreadable balances as zero rather than throwing', () => {
    expect(balanceSignature(PAIR, null, undefined)).toBe(
      'USDC:slot=0,normal=0|XLM:slot=0,normal=0'
    );
    expect(balanceSignature(PAIR, [a('USDC', null)], [a('XLM', 'not-a-number')])).toBe(
      'USDC:slot=0,normal=0|XLM:slot=0,normal=0'
    );
  });

  it('sums rows that share a symbol', () => {
    expect(balanceSignature(['USDC'], [a('USDC', '1'), a('USDC', '2')], null)).toBe(
      'USDC:slot=3,normal=0'
    );
  });
});

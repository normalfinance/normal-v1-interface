import { duneRetryDelayMs } from './client';

const BUDGET = 120_000;

describe('duneRetryDelayMs — only a 429 is worth retrying', () => {
  it('backs off 5s → 15s → 30s across attempts, then gives up', () => {
    expect(duneRetryDelayMs(429, 1, null, BUDGET)).toBe(5_000);
    expect(duneRetryDelayMs(429, 2, null, BUDGET)).toBe(15_000);
    expect(duneRetryDelayMs(429, 3, null, BUDGET)).toBe(30_000);
    expect(duneRetryDelayMs(429, 4, null, BUDGET)).toBeNull();
  });

  it('honours Retry-After when Dune sends one, capped at 60s', () => {
    expect(duneRetryDelayMs(429, 1, '20', BUDGET)).toBe(20_000);
    expect(duneRetryDelayMs(429, 1, '600', BUDGET)).toBe(60_000);
    // junk header falls back to the backoff ladder
    expect(duneRetryDelayMs(429, 1, 'soon', BUDGET)).toBe(5_000);
  });

  it('never retries non-429 — a 5xx insert may have committed and would double rows', () => {
    expect(duneRetryDelayMs(500, 1, null, BUDGET)).toBeNull();
    expect(duneRetryDelayMs(502, 1, null, BUDGET)).toBeNull();
    expect(duneRetryDelayMs(400, 1, null, BUDGET)).toBeNull();
    expect(duneRetryDelayMs(404, 1, null, BUDGET)).toBeNull();
  });

  it('gives up when the run budget cannot afford the wait', () => {
    expect(duneRetryDelayMs(429, 1, null, 4_999)).toBeNull();
    expect(duneRetryDelayMs(429, 1, null, 5_000)).toBe(5_000);
  });
});

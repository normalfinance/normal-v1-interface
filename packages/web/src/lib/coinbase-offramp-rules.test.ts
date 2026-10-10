import {
  coinbaseCanSell,
  orderIsFromHandoff,
  sellWindowRemainingMs,
  COINBASE_SELL_WINDOW_MS,
} from './coinbase-offramp-rules';

describe('coinbaseCanSell (verified against /sell/options?country=US, 2026-10-09)', () => {
  it('never offers Coinbase for Stellar assets', () => {
    expect(coinbaseCanSell('stellar', 'XLM')).toBe(false);
    expect(coinbaseCanSell('stellar', 'USDC')).toBe(false);
  });
  it('offers the native assets and USDC on the chains Coinbase lists', () => {
    expect(coinbaseCanSell('bitcoin', 'BTC')).toBe(true);
    expect(coinbaseCanSell('ethereum', 'ETH')).toBe(true);
    expect(coinbaseCanSell('ethereum', 'USDC')).toBe(true);
    expect(coinbaseCanSell('solana', 'SOL')).toBe(true);
    expect(coinbaseCanSell('solana', 'USDC')).toBe(true);
  });
  it('refuses asset/chain mismatches', () => {
    expect(coinbaseCanSell('bitcoin', 'USDC')).toBe(false);
    expect(coinbaseCanSell('solana', 'ETH')).toBe(false);
  });
});

describe('sellWindowRemainingMs', () => {
  const now = Date.parse('2026-10-09T12:00:00Z');
  it('counts down from createdAt + 30 min', () => {
    expect(sellWindowRemainingMs('2026-10-09T11:50:00Z', now)).toBe(
      COINBASE_SELL_WINDOW_MS - 10 * 60_000
    );
  });
  it('goes negative once the window has passed', () => {
    expect(sellWindowRemainingMs('2026-10-09T11:00:00Z', now)).toBeLessThan(0);
  });
  it('returns null for a missing or unparseable createdAt', () => {
    expect(sellWindowRemainingMs(null, now)).toBeNull();
    expect(sellWindowRemainingMs('yesterday', now)).toBeNull();
  });
});

describe('orderIsFromHandoff', () => {
  const handoff = {
    at: Date.parse('2026-10-09T12:00:00Z'),
    sym: 'BTC',
    chain: 'bitcoin' as const,
    amount: '0.01',
  };
  it('accepts an order created after the hand-off (within clock skew)', () => {
    expect(orderIsFromHandoff('2026-10-09T12:01:00Z', handoff, 'BTC')).toBe(true);
    expect(orderIsFromHandoff('2026-10-09T11:58:30Z', handoff, 'BTC')).toBe(true);
  });
  it('rejects an older abandoned order', () => {
    expect(orderIsFromHandoff('2026-10-09T10:00:00Z', handoff, 'BTC')).toBe(false);
  });
  it('rejects an undated order when a hand-off is known', () => {
    expect(orderIsFromHandoff(null, handoff, 'BTC')).toBe(false);
  });
  it('falls back to the other filters when there is no marker or it is for another asset', () => {
    expect(orderIsFromHandoff('2026-10-09T10:00:00Z', null, 'BTC')).toBe(true);
    expect(orderIsFromHandoff('2026-10-09T10:00:00Z', handoff, 'SOL')).toBe(true);
  });
});

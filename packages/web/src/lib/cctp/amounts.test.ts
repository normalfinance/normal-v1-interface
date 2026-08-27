// Doc 95 Wave 3. The numbers here are the REAL ones from 2026-08-26, when a
// whole-balance burn swept a sibling transfer's USDC on a live account.
import { scopedAmountWire } from './amounts';

const usdc = (n: string) => BigInt(Math.round(Number(n) * 1e6));

describe('scopedAmountWire — the live incident', () => {
  it('a burn no longer sweeps the sibling transfer (the actual bug)', () => {
    // Two BTC swaps landed on one Base address: 15.59 arrived for row A,
    // then row B (quoting 16.75) burned the lot — 32.40 — orphaning A.
    const available = usdc('32.399442');
    const expected = usdc('16.748840');
    const taken = scopedAmountWire(available, expected);
    expect(taken).toBeLessThan(available);
    // It may take its own amount plus slippage headroom, and no more.
    expect(taken).toBe(expected + expected / 20n);
    // The sibling's share survives. It is very slightly less than the
    // sibling's own 15.45, because the 5% slippage headroom nibbles into it —
    // an accepted trade: the sibling's own burn then takes whatever is
    // actually there (partial arrival is handled), so no money is lost and no
    // row is orphaned. Before this fix the sibling was left with ZERO.
    expect(available - taken).toBe(usdc('14.813160'));
    expect(available - taken).toBeGreaterThan(usdc('14.8'));
  });

  it('still captures positive slippage on a lone transfer', () => {
    // Row quoted 15.170713, 15.587606 actually arrived (+2.7%): take it all.
    expect(scopedAmountWire(usdc('15.587606'), usdc('15.170713'))).toBe(usdc('15.587606'));
  });

  it('does not strand slippage the way the old client clamp did', () => {
    const expected = usdc('10');
    const arrived = usdc('10.3');
    expect(scopedAmountWire(arrived, expected)).toBe(arrived); // not clamped to 10
  });
});

describe('scopedAmountWire — boundaries', () => {
  it('partial arrival takes only what is there', () => {
    expect(scopedAmountWire(usdc('7'), usdc('10'))).toBe(usdc('7'));
  });

  it('a sweep row (no quote) takes everything — refunds must not strand funds', () => {
    expect(scopedAmountWire(usdc('31.879105'), 0n)).toBe(usdc('31.879105'));
  });

  it('an empty address yields nothing', () => {
    expect(scopedAmountWire(0n, usdc('10'))).toBe(0n);
    expect(scopedAmountWire(0n, 0n)).toBe(0n);
  });

  it('exactly at the cap is allowed, one unit past it is capped', () => {
    const expected = usdc('20');
    const cap = expected + expected / 20n;
    expect(scopedAmountWire(cap, expected)).toBe(cap);
    expect(scopedAmountWire(cap + 1n, expected)).toBe(cap);
  });
});

// #67 XLM savings guard — the outflow reserve and the fee semaphore. These
// helpers are the single source of truth for "how much XLM may leave" and
// "what color is the savings fee light"; every boundary here maps to a real
// user-visible behavior (a blocked send, a red banner).

import {
  xlmFeeStatus,
  spendableXlm,
  stellarMinReserve,
  SAVINGS_XLM_BUFFER,
  STELLAR_TX_FEE_XLM,
  xlmAvailableForFees,
  spendableXlmForOutflow,
  MIN_XLM_FOR_SAVINGS_TX,
} from './stellar-reserve';

describe('spendableXlmForOutflow (#67 outflow guard)', () => {
  it('without savings, equals the plain network-reserve spendable', () => {
    const balance = 20;
    expect(spendableXlmForOutflow(balance, 1, false).toFixed()).toBe(
      spendableXlm(balance, 1).toFixed()
    );
  });

  it('with savings, holds back exactly SAVINGS_XLM_BUFFER more', () => {
    const balance = 20;
    const without = spendableXlmForOutflow(balance, 1, false);
    const withSavings = spendableXlmForOutflow(balance, 1, true);
    expect(without.minus(withSavings).toFixed()).toBe(String(SAVINGS_XLM_BUFFER));
  });

  it('floors at zero for a saver whose balance is inside the protected zone', () => {
    // 2.2 XLM, 1 subentry: network reserve 1.5 + fee leaves ~0.7 — all of it
    // inside the 1 XLM savings buffer, so NOTHING is spendable.
    expect(spendableXlmForOutflow(2.2, 1, true).toFixed()).toBe('0');
    // ...but a non-saver with the same balance can still send the ~0.7.
    expect(spendableXlmForOutflow(2.2, 1, false).gt(0)).toBe(true);
  });

  it('respects the subentry count like the base helper', () => {
    // Each extra subentry locks another 0.5 XLM.
    const oneEntry = spendableXlmForOutflow(20, 1, true);
    const threeEntries = spendableXlmForOutflow(20, 3, true);
    expect(oneEntry.minus(threeEntries).toFixed()).toBe('1');
  });

  it('never returns a negative value', () => {
    expect(spendableXlmForOutflow(0, 1, true).toFixed()).toBe('0');
    expect(spendableXlmForOutflow(1, 5, true).toFixed()).toBe('0');
  });
});

describe('xlmFeeStatus (#67 semaphore)', () => {
  // With 1 subentry the minimum reserve is 1.5 XLM; fee-available = balance − 1.5.
  const reserve = stellarMinReserve(1).toNumber();

  it('blocked (red) below one savings action worth of fees', () => {
    expect(xlmFeeStatus(reserve, 1)).toBe('blocked'); // 0 available
    expect(xlmFeeStatus(reserve + MIN_XLM_FOR_SAVINGS_TX - 0.01, 1)).toBe('blocked');
  });

  it('low (yellow) from one action up to the guard buffer', () => {
    expect(xlmFeeStatus(reserve + MIN_XLM_FOR_SAVINGS_TX, 1)).toBe('low'); // exactly 0.5
    expect(xlmFeeStatus(reserve + SAVINGS_XLM_BUFFER - 0.01, 1)).toBe('low');
  });

  it('ok (green) at or above the guard buffer', () => {
    expect(xlmFeeStatus(reserve + SAVINGS_XLM_BUFFER, 1)).toBe('ok'); // exactly 1.0
    expect(xlmFeeStatus(reserve + 10, 1)).toBe('ok');
  });

  it('subentry count shifts the whole scale, defaulting to 1', () => {
    const balance = stellarMinReserve(4).toNumber() + SAVINGS_XLM_BUFFER;
    expect(xlmFeeStatus(balance, 4)).toBe('ok');
    // Same balance judged with fewer locked subentries is also fine…
    expect(xlmFeeStatus(balance, 1)).toBe('ok');
    // …but a balance sized for 1 subentry is not enough for 4.
    expect(xlmFeeStatus(stellarMinReserve(1).toNumber() + SAVINGS_XLM_BUFFER, 4)).toBe('blocked');
  });

  it('boundary sanity: the three states cover the whole range in order', () => {
    const probes = [0, 0.4, 0.5, 0.9, 1, 5].map((extra) => xlmFeeStatus(reserve + extra, 1));
    expect(probes).toEqual(['blocked', 'blocked', 'low', 'low', 'ok', 'ok']);
  });

  it('the guard maintains green: a saver at the guard boundary reads ok', () => {
    // If sends/swaps stop at spendableXlmForOutflow(...) = 0, the account keeps
    // reserve + buffer (+ fee dust) — which must classify as 'ok', never 'low'.
    const balanceLeft = stellarMinReserve(1)
      .plus(SAVINGS_XLM_BUFFER)
      .plus(STELLAR_TX_FEE_XLM)
      .toNumber();
    expect(xlmFeeStatus(balanceLeft, 1)).toBe('ok');
    expect(xlmAvailableForFees(balanceLeft, 1).gte(SAVINGS_XLM_BUFFER)).toBe(true);
  });
});

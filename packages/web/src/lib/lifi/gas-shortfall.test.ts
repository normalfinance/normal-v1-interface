// The dynamic-gas admission math (2026-08-21). Anchored to the live incident:
// balance 9,062,649,619,132,963 wei, tx wanted 9,093,940,355,115,400 — the
// node refused pre-broadcast; these tests pin the local reproduction of that
// rule and the affordable-amount suggestion the dialog offers instead.

import { maxAffordableEth, GasShortfallError, computeAffordability } from './gas-shortfall';

const GWEI = 1_000_000_000n;

describe('computeAffordability', () => {
  it('accepts when balance covers value + gas exactly', () => {
    const r = computeAffordability({
      balanceWei: 1_000n * GWEI,
      valueWei: 900n * GWEI,
      gasLimit: 100n,
      feePerGas: GWEI,
    });
    expect(r.affordable).toBe(true);
    expect(r.shortfallWei).toBe(0n);
  });

  it('reproduces the 2026-08-21 live incident as a shortfall', () => {
    // relaydepository deposit: value 0.00856264 ETH, ~531k gas budget.
    const r = computeAffordability({
      balanceWei: 9_062_649_619_132_963n,
      valueWei: 8_562_640_000_000_000n,
      gasLimit: 520_842n,
      feePerGas: 1_020_100_000n, // ≈1.02 gwei → the observed 531,300,355,115,400 gas budget
    });
    expect(r.affordable).toBe(false);
    expect(r.shortfallWei).toBeGreaterThan(0n);
    // The suggestion must fit: value' + gas ≤ balance at the same price.
    expect(r.maxAffordableWei + r.gasWei <= 9_062_649_619_132_963n).toBe(true);
  });

  it('floors maxAffordable at zero when gas alone exceeds the balance', () => {
    const r = computeAffordability({
      balanceWei: 10n * GWEI,
      valueWei: 0n,
      gasLimit: 100n,
      feePerGas: GWEI, // gas budget 100 gwei > 10 gwei balance
    });
    expect(r.affordable).toBe(false);
    expect(r.maxAffordableWei).toBe(0n);
  });

  it('same math serves legacy and eip1559 (feePerGas is the only price input)', () => {
    const base = {
      balanceWei: 2_000_000n * GWEI,
      valueWei: 1_000_000n * GWEI,
      gasLimit: 500_000n,
    };
    const legacy = computeAffordability({ ...base, feePerGas: GWEI });
    const eip1559 = computeAffordability({ ...base, feePerGas: GWEI });
    expect(legacy).toEqual(eip1559);
  });
});

describe('maxAffordableEth', () => {
  it('rounds DOWN so the suggestion is affordable at the same price', () => {
    const err = new GasShortfallError({
      affordable: false,
      balanceWei: 9_062_649_619_132_963n,
      costWei: 9_093_940_355_115_400n,
      gasWei: 531_300_355_115_400n,
      maxAffordableWei: 8_531_349_263_017_563n, // 0.008531349263017563 ETH
      shortfallWei: 31_290_735_982_437n,
    });
    expect(maxAffordableEth(err)).toBe('0.00853134');
  });

  it('handles a zero suggestion', () => {
    const err = new GasShortfallError({
      affordable: false,
      balanceWei: 1n,
      costWei: 2n,
      gasWei: 2n,
      maxAffordableWei: 0n,
      shortfallWei: 1n,
    });
    expect(maxAffordableEth(err)).toBe('0');
  });
});

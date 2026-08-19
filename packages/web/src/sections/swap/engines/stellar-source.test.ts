import { BigNumber } from 'bignumber.js';
import { it, expect, describe } from '@jest/globals';

import { defaultStellarSource } from './stellar-source';

// Pins the chunk-4f rule: hybrid Stellar swaps open on the wallet that can
// pay. The observed bug this guards against: empty Lobstr in the slot, 27
// USDC in the Normal wallet, swap card showing a confident 0.00.

const bn = (v: string | number) => BigNumber(v);

describe('defaultStellarSource', () => {
  it('picks the Normal wallet when it alone holds the asset (the reported case)', () => {
    expect(defaultStellarSource(bn('27.48'), bn(0))).toBe('normal');
  });

  it('picks the external wallet when it alone holds the asset', () => {
    expect(defaultStellarSource(bn(0), bn('12.5'))).toBe('external');
  });

  it('picks the richer wallet when both hold some', () => {
    expect(defaultStellarSource(bn(5), bn(100))).toBe('external');
    expect(defaultStellarSource(bn(100), bn(5))).toBe('normal');
  });

  it('ties — including both empty — go to the Normal wallet', () => {
    expect(defaultStellarSource(bn(0), bn(0))).toBe('normal');
    expect(defaultStellarSource(bn(10), bn(10))).toBe('normal');
  });
});

/**
 * @jest-environment jsdom
 */
// Pins the #62 spendable math: money committed to in-flight sends/swaps must
// never be offered again (Niko's scenario: send SOL, then MAX-swap while the
// balance display still includes the sent amount).
import type * as SpendableModule from '@/lib/spendable';
import type * as PendingSendsModule from '@/lib/pending-sends';

import { it, jest, expect, describe, beforeEach } from '@jest/globals';

function freshModules(): { spendable: typeof SpendableModule; sends: typeof PendingSendsModule } {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports */
  return {
    spendable: require('@/lib/spendable'),
    sends: require('@/lib/pending-sends'),
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
}

describe('pendingOutflowAmount (#62)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('THE SCENARIO: a pending SOL send is subtracted from what SOL flows may offer', () => {
    const { spendable, sends } = freshModules();
    sends.addPendingSend({
      txHash: 'sig1',
      chain: 'solana',
      symbol: 'SOL',
      amount: '2.5',
      destination: 'dest',
    });
    expect(spendable.pendingOutflowAmount('solana', 'SOL')).toBe('2.5');
    // ...and does NOT touch other chains or assets:
    expect(spendable.pendingOutflowAmount('ethereum', 'ETH')).toBe('0');
    expect(spendable.pendingOutflowAmount('solana', 'USDC')).toBe('0');
  });

  it('multiple pending sends on one asset sum', () => {
    const { spendable, sends } = freshModules();
    sends.addPendingSend({
      txHash: 'a',
      chain: 'ethereum',
      symbol: 'ETH',
      amount: '0.1',
      destination: 'x',
    });
    sends.addPendingSend({
      txHash: 'b',
      chain: 'ethereum',
      symbol: 'ETH',
      amount: '0.25',
      destination: 'y',
    });
    expect(spendable.pendingOutflowAmount('ethereum', 'ETH')).toBe('0.35');
  });

  it('an in-flight swap source amount counts, and clears on settle', () => {
    const { spendable } = freshModules();
    spendable.registerSwapOutflow('swap1', { chain: 'ethereum', symbol: 'ETH', amount: '0.05' });
    expect(spendable.pendingOutflowAmount('ethereum', 'ETH')).toBe('0.05');
    spendable.clearSwapOutflow('swap1');
    expect(spendable.pendingOutflowAmount('ethereum', 'ETH')).toBe('0');
    // double-clear is safe
    spendable.clearSwapOutflow('swap1');
  });

  it('a settled send releases the amount (activity reconcile clears the row)', () => {
    const { spendable, sends } = freshModules();
    sends.addPendingSend({
      txHash: 'done1',
      chain: 'solana',
      symbol: 'SOL',
      amount: '1',
      destination: 'd',
    });
    sends.reconcilePendingSends(sends.toHashSet(['done1']));
    expect(spendable.pendingOutflowAmount('solana', 'SOL')).toBe('0');
  });

  it('garbage amounts are ignored, never NaN', () => {
    const { spendable, sends } = freshModules();
    sends.addPendingSend({
      txHash: 'g',
      chain: 'ethereum',
      symbol: 'ETH',
      amount: 'oops',
      destination: 'd',
    });
    expect(spendable.pendingOutflowAmount('ethereum', 'ETH')).toBe('0');
  });

  it('undefined chain/symbol → zero (no accidental global subtraction)', () => {
    const { spendable } = freshModules();
    expect(spendable.pendingOutflowAmount(undefined, 'ETH')).toBe('0');
    expect(spendable.pendingOutflowAmount('ethereum', undefined)).toBe('0');
  });
});

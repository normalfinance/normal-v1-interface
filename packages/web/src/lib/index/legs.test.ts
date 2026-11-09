import { it, expect, describe } from '@jest/globals';

import {
  legRunnable,
  purchasePhase,
  INDEX_DIRECTION,
  LEG_MAX_ATTEMPTS,
  statusAfterFailure,
  LEG_CLAIM_STALE_MS,
  purchaseReadyForLegs,
} from './legs';

const NOW = 1_800_000_000_000;
const leg = (over: Partial<Parameters<typeof legRunnable>[0]> = {}) => ({
  id: 'l1',
  status: 'PENDING',
  dstSwapTxHash: null,
  retryCount: 0,
  updatedAt: new Date(NOW - 1000),
  ...over,
});

describe('legRunnable', () => {
  it('a waiting leg runs', () => {
    expect(legRunnable(leg(), NOW)).toBe(true);
  });
  it('a leg whose swap is out never runs again, whatever its status says', () => {
    expect(legRunnable(leg({ dstSwapTxHash: '0xabc' }), NOW)).toBe(false);
    expect(
      legRunnable(leg({ status: 'SWAPPING', dstSwapTxHash: '0xabc' }), NOW + 10 * 60_000)
    ).toBe(false);
  });
  it('a claimed leg is left alone, unless the claim is a crashed run', () => {
    expect(legRunnable(leg({ status: 'SWAPPING' }), NOW)).toBe(false);
    expect(
      legRunnable(
        leg({ status: 'SWAPPING', updatedAt: new Date(NOW - LEG_CLAIM_STALE_MS - 1) }),
        NOW
      )
    ).toBe(true);
  });
  it('sent and held legs are done, and attempts are capped', () => {
    expect(legRunnable(leg({ status: 'SENT' }), NOW)).toBe(false);
    expect(legRunnable(leg({ status: 'HELD' }), NOW)).toBe(false);
    expect(legRunnable(leg({ retryCount: LEG_MAX_ATTEMPTS }), NOW)).toBe(false);
  });
});

it('statusAfterFailure: retry, then hold at the cap', () => {
  expect(statusAfterFailure(1)).toBe('PENDING');
  expect(statusAfterFailure(LEG_MAX_ATTEMPTS - 1)).toBe('PENDING');
  expect(statusAfterFailure(LEG_MAX_ATTEMPTS)).toBe('HELD');
});

describe('purchase', () => {
  const row = {
    direction: INDEX_DIRECTION,
    status: 'COMPLETED',
    burnTxHash: 'b',
    mintTxHash: '0xm',
  };
  it('is ready for its legs only once Circle has minted on Base', () => {
    expect(purchaseReadyForLegs(row)).toBe(true);
    expect(purchaseReadyForLegs({ ...row, mintTxHash: null })).toBe(false);
    expect(purchaseReadyForLegs({ ...row, burnTxHash: null })).toBe(false);
    expect(purchaseReadyForLegs({ ...row, status: 'FAILED' })).toBe(false);
    // a single-coin Circle swap is never mistaken for a purchase
    expect(purchaseReadyForLegs({ ...row, direction: 'stellar_to_crosschain' })).toBe(false);
  });

  it('reads as one phase', () => {
    const sent = { status: 'SENT' };
    expect(purchasePhase({ ...row, burnTxHash: null, mintTxHash: null }, [])).toBe('record');
    expect(purchasePhase({ ...row, mintTxHash: null }, [])).toBe('bridging');
    expect(purchasePhase(row, [sent, { status: 'PENDING' }])).toBe('buying');
    expect(purchasePhase(row, [sent, sent, sent])).toBe('delivering');
    expect(purchasePhase(row, [sent, { status: 'HELD' }])).toBe('held');
    expect(purchasePhase({ ...row, status: 'FAILED' }, [sent])).toBe('failed');
  });
});

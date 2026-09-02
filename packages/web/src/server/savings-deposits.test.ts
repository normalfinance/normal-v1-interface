// Pins the #55 fix: "Your Deposits" must be correct the instant a transaction
// completes, no matter how far behind DeFindex's indexer or our caches are.
// The regression case uses the EXACT live numbers from the 2026-08-10
// incident (rapid withdraw→deposit left 18.455 on screen instead of 23.430).
import { it, expect, describe } from '@jest/globals';
import {
  eventTxId,
  PENDING_ROW_WINDOW_MS,
  reconcileTotalDeposited,
} from '@/server/savings-deposits';

const NOW = 1_760_000_000_000;
const secondsAgo = (s: number) => new Date(NOW - s * 1000);

describe('reconcileTotalDeposited (#55)', () => {
  it('THE INCIDENT: deposit made after the events snapshot is counted from our row', () => {
    // Events were read between the withdraw (indexed) and the deposit (not
    // yet): total 18.4551934. Our own row for the deposit already existed.
    const result = reconcileTotalDeposited({
      eventsTotal: 18.4551934,
      eventTxIds: ['withdraw-tx', 'older-deposit-tx'],
      rows: [
        {
          type: 'deposit',
          amount: '4.9750000',
          txHash: 'new-deposit-tx',
          createdAt: secondsAgo(5),
        },
        // Already-indexed actions must not double-count:
        { type: 'withdraw', amount: '6', txHash: 'withdraw-tx', createdAt: secondsAgo(35) },
      ],
      nowMs: NOW,
    });
    expect(result.total).toBeCloseTo(23.4301934, 7);
    expect(result.pendingCount).toBe(1);
  });

  it('a row the indexer has already included changes nothing', () => {
    const result = reconcileTotalDeposited({
      eventsTotal: 100,
      eventTxIds: ['tx-a'],
      rows: [{ type: 'deposit', amount: '5', txHash: 'tx-a', createdAt: secondsAgo(10) }],
      nowMs: NOW,
    });
    expect(result).toEqual({ total: 100, pendingCount: 0 });
  });

  it('a pending withdraw subtracts', () => {
    const result = reconcileTotalDeposited({
      eventsTotal: 100,
      eventTxIds: [],
      rows: [{ type: 'withdraw', amount: '30', txHash: 'w1', createdAt: secondsAgo(10) }],
      nowMs: NOW,
    });
    expect(result).toEqual({ total: 70, pendingCount: 1 });
  });

  it('non-confirmed rows are ignored (#27) — pending/failed money never counts', () => {
    const result = reconcileTotalDeposited({
      eventsTotal: 100,
      eventTxIds: [],
      rows: [
        {
          type: 'deposit',
          amount: '5',
          txHash: 'p1',
          createdAt: secondsAgo(10),
          status: 'pending',
        },
        { type: 'deposit', amount: '5', txHash: 'f1', createdAt: secondsAgo(10), status: 'failed' },
        {
          type: 'deposit',
          amount: '5',
          txHash: 'c1',
          createdAt: secondsAgo(10),
          status: 'confirmed',
        },
      ],
      nowMs: NOW,
    });
    expect(result).toEqual({ total: 105, pendingCount: 1 });
  });

  it('rows without a tx hash are ignored — they could only ever double-count', () => {
    const result = reconcileTotalDeposited({
      eventsTotal: 100,
      eventTxIds: [],
      rows: [{ type: 'deposit', amount: '5', txHash: null, createdAt: secondsAgo(10) }],
      nowMs: NOW,
    });
    expect(result).toEqual({ total: 100, pendingCount: 0 });
  });

  it('rows older than the window are ignored — indexer lag is seconds, not days', () => {
    const result = reconcileTotalDeposited({
      eventsTotal: 100,
      eventTxIds: [],
      rows: [
        {
          type: 'deposit',
          amount: '5',
          txHash: 'ancient',
          createdAt: new Date(NOW - PENDING_ROW_WINDOW_MS - 1000),
        },
      ],
      nowMs: NOW,
    });
    expect(result).toEqual({ total: 100, pendingCount: 0 });
  });

  it('duplicate rows for one tx count once', () => {
    const result = reconcileTotalDeposited({
      eventsTotal: 0,
      eventTxIds: [],
      rows: [
        { type: 'deposit', amount: '5', txHash: 'dup', createdAt: secondsAgo(5) },
        { type: 'deposit', amount: '5', txHash: 'dup', createdAt: secondsAgo(6) },
      ],
      nowMs: NOW,
    });
    expect(result).toEqual({ total: 5, pendingCount: 1 });
  });

  it('never goes below zero', () => {
    const result = reconcileTotalDeposited({
      eventsTotal: 1,
      eventTxIds: [],
      rows: [{ type: 'withdraw', amount: '10', txHash: 'w', createdAt: secondsAgo(5) }],
      nowMs: NOW,
    });
    expect(result.total).toBe(0);
  });

  it('garbage amounts and unknown types are skipped, not summed as NaN', () => {
    const result = reconcileTotalDeposited({
      eventsTotal: 50,
      eventTxIds: [],
      rows: [
        { type: 'deposit', amount: 'not-a-number', txHash: 'g1', createdAt: secondsAgo(5) },
        { type: 'transfer', amount: '5', txHash: 'g2', createdAt: secondsAgo(5) },
        { type: 'deposit', amount: '-5', txHash: 'g3', createdAt: secondsAgo(5) },
      ],
      nowMs: NOW,
    });
    expect(result).toEqual({ total: 50, pendingCount: 0 });
  });
});

describe('eventTxId', () => {
  it('reads the live API shape (transactionId) and older fallbacks', () => {
    expect(eventTxId({ transactionId: 'abc' })).toBe('abc');
    expect(eventTxId({ txHash: 'def' })).toBe('def');
    expect(eventTxId({ transaction_hash: 'ghi' })).toBe('ghi');
    expect(eventTxId({})).toBeNull();
    expect(eventTxId(null)).toBeNull();
  });
});

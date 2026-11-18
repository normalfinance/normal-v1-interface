// Pins the #55 fix: "Your Deposits" must be correct the instant a transaction
// completes, no matter how far behind DeFindex's indexer or our caches are.
// The regression case uses the EXACT live numbers from the 2026-08-10
// incident (rapid withdraw→deposit left 18.455 on screen instead of 23.430).
import { it, expect, describe } from '@jest/globals';
import {
  eventTxId,
  principalFromEvents,
  PENDING_ROW_WINDOW_MS,
  reconcileTotalDeposited,
  totalDepositedWithoutHistory,
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

describe('totalDepositedWithoutHistory (security report, 2026-11-04)', () => {
  const deposit = (amount: string) => ({ type: 'deposit', amount });
  const withdraw = (amount: string) => ({ type: 'withdraw', amount });

  it('with no rows, counts what is in the vault: no earnings invented', () => {
    expect(totalDepositedWithoutHistory([], 120)).toBe(120);
  });

  it('never reports less than the vault holds, so a partial history cannot inflate earnings', () => {
    // A pre-#27 deposit of 100 has no row here; the vault holds 150.
    expect(totalDepositedWithoutHistory([deposit('50')], 150)).toBe(150);
  });

  it('keeps the recorded figure when the vault holds less (a loss)', () => {
    expect(totalDepositedWithoutHistory([deposit('100'), withdraw('10')], 85)).toBe(90);
  });

  it('a just-made deposit counts while the vault balance still reads 0', () => {
    expect(totalDepositedWithoutHistory([deposit('25')], 0)).toBe(25);
  });

  it('never goes below zero', () => {
    expect(totalDepositedWithoutHistory([withdraw('40')], 0)).toBe(0);
  });
});

// A DeFindex event as the live API returns it: 7-decimal integer strings,
// USDC in assets[0].amount, vault shares in dfTokenAmount.
const event = (type: 'deposit' | 'withdraw', usdc: number, shares: number | null, at: string) => ({
  timestamp: at,
  ledger: Math.floor(Date.parse(at) / 5000),
  type,
  assets: [{ amount: String(Math.round(usdc * 1e7)) }],
  ...(shares === null ? {} : { dfTokenAmount: String(Math.round(shares * 1e7)) }),
  transactionId: `${type}-${at}`,
});

describe('principalFromEvents: "You put in" is the money still invested', () => {
  it('THE REPORT (2026-11-14): a withdrawal paid out yield, then a new deposit', () => {
    // A partner's real history, newest first as the API lists it. Deposits
    // minus withdrawals said 484.81 put in and 12.87 earned; the 12.69 of
    // yield in the August withdrawal had already been paid out.
    const events = [
      event('deposit', 497.5, 471.4011, '2026-11-11T17:56:12Z'),
      event('withdraw', 762.6689, 733.0536, '2026-08-20T16:40:52Z'),
      event('deposit', 125.1213, 121.4652, '2026-06-25T17:35:08Z'),
      event('deposit', 376.11, 368.024, '2026-05-14T19:59:21Z'),
      event('deposit', 248.75, 243.5646, '2026-05-11T16:51:54Z'),
    ];
    const principal = principalFromEvents(events) as number;
    expect(principal).toBeCloseTo(497.5, 3);
    // The vault held 471.4011 shares x 1.0557568 = 497.68: 0.18 earned (DeFindex's
    // own figure: 0.18492), not 12.87.
    expect(471.4011 * 1.0557568 - principal).toBeCloseTo(0.18, 2);
  });

  it('a partial withdrawal removes its fraction of the principal, not its full amount', () => {
    // 1000 in for 1000 shares; later 500 shares come out as 525 (5% grown).
    const events = [
      event('deposit', 1000, 1000, '2026-01-01T00:00:00Z'),
      event('withdraw', 525, 500, '2026-06-01T00:00:00Z'),
    ];
    // Half the shares, so half the principal: 500. The old rule said 475,
    // and charged commission again on the 25 of yield already paid out.
    expect(principalFromEvents(events)).toBe(500);
  });

  it('a full withdrawal leaves 0, and its yield never counts against the next deposit', () => {
    const events = [
      event('deposit', 50, 45, '2026-09-01T00:00:00Z'),
      event('withdraw', 110, 100, '2026-08-01T00:00:00Z'),
      event('deposit', 100, 100, '2026-01-01T00:00:00Z'),
    ];
    expect(principalFromEvents(events)).toBe(50); // the old rule: 40
  });

  it('reads the history in chain order whatever order it arrives in', () => {
    const chronological = [
      event('deposit', 1000, 1000, '2026-01-01T00:00:00Z'),
      event('withdraw', 525, 500, '2026-06-01T00:00:00Z'),
      event('deposit', 200, 190, '2026-07-01T00:00:00Z'),
    ];
    expect(principalFromEvents(chronological)).toBe(700);
    expect(principalFromEvents([...chronological].reverse())).toBe(700);
  });

  it('a withdrawal without a share amount falls back to its full amount', () => {
    const events = [
      event('deposit', 100, 100, '2026-01-01T00:00:00Z'),
      event('withdraw', 30, null, '2026-02-01T00:00:00Z'),
    ];
    expect(principalFromEvents(events)).toBe(70);
  });

  it('without any order to read, the whole history falls back to deposits minus withdrawals', () => {
    const unordered = [
      { type: 'deposit', assets: [{ amount: '1000000000' }], dfTokenAmount: '1000000000' },
      { type: 'withdraw', assets: [{ amount: '525000000' }], dfTokenAmount: '500000000' },
    ];
    expect(principalFromEvents(unordered)).toBe(47.5);
  });

  it('no history is null, so the caller uses totalDepositedWithoutHistory', () => {
    expect(principalFromEvents([])).toBeNull();
    expect(principalFromEvents([{ type: 'rebalance' }])).toBeNull();
  });

  it('never goes below zero', () => {
    const events = [
      event('deposit', 10, null, '2026-01-01T00:00:00Z'),
      event('withdraw', 40, null, '2026-02-01T00:00:00Z'),
    ];
    expect(principalFromEvents(events)).toBe(0);
  });
});

describe('reconcileTotalDeposited with the vault balance: pending rows at average cost', () => {
  it('a withdrawal the indexer has not seen yet removes its fraction of the principal', () => {
    // Principal 1000; a 525 withdrawal is ours but not in the events yet;
    // the vault already reads 525 after it, so it held 1050 before: half.
    const result = reconcileTotalDeposited({
      eventsTotal: 1000,
      eventTxIds: [],
      rows: [{ type: 'withdraw', amount: '525', txHash: 'w1', createdAt: secondsAgo(20) }],
      nowMs: NOW,
      currentValue: 525,
    });
    expect(result).toEqual({ total: 500, pendingCount: 1 });
  });

  it('a pending deposit adds its full amount, as before', () => {
    const result = reconcileTotalDeposited({
      eventsTotal: 100,
      eventTxIds: [],
      rows: [{ type: 'deposit', amount: '50', txHash: 'd1', createdAt: secondsAgo(20) }],
      nowMs: NOW,
      currentValue: 150,
    });
    expect(result).toEqual({ total: 150, pendingCount: 1 });
  });

  it('a pending full withdrawal leaves 0', () => {
    const result = reconcileTotalDeposited({
      eventsTotal: 497.5,
      eventTxIds: [],
      rows: [{ type: 'withdraw', amount: '497.69', txHash: 'w2', createdAt: secondsAgo(20) }],
      nowMs: NOW,
      currentValue: 0,
    });
    expect(result.total).toBe(0);
  });
});

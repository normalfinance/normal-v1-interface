/**
 * @jest-environment jsdom
 */
import type { ChainId } from '@/lib/chains/registry';
import type * as PendingSendsModule from '@/lib/pending-sends';

import { it, jest, expect, describe, beforeEach } from '@jest/globals';

const STORAGE_KEY = 'nf:pending-sends:v1';

// The ledger is module-level state hydrated from localStorage, so each test
// gets a fresh module instance — importing once at the top would let state
// leak between tests and make them order-dependent.
function freshLedger(): typeof PendingSendsModule {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/pending-sends');
}

const entry = (txHash: string, chain: ChainId = 'stellar') => ({
  txHash,
  chain,
  symbol: 'XLM',
  amount: '5',
  destination: 'GDEST',
});

describe('pending-sends ledger', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores an added send and returns it', () => {
    const ledger = freshLedger();
    ledger.addPendingSend(entry('abc123'));

    const all = ledger.getPendingSends();
    expect(all).toHaveLength(1);
    expect(all[0].txHash).toBe('abc123');
    expect(all[0].createdAt).toBeGreaterThan(0);
  });

  it('ignores a duplicate hash instead of double-listing a send', () => {
    const ledger = freshLedger();
    ledger.addPendingSend(entry('abc123'));
    ledger.addPendingSend(entry('ABC123')); // same hash, different casing

    expect(ledger.getPendingSends()).toHaveLength(1);
  });

  it('survives a reload (localStorage round-trip)', () => {
    const first = freshLedger();
    first.addPendingSend(entry('deadbeef', 'bitcoin'));

    // A fresh module instance = a page reload: state must come back from disk.
    const second = freshLedger();
    const all = second.getPendingSends();
    expect(all).toHaveLength(1);
    expect(all[0].chain).toBe('bitcoin');
  });

  it('removes an entry when the feed knows its hash — case-insensitively', () => {
    const ledger = freshLedger();
    ledger.addPendingSend(entry('AbCdEf'));

    // The chain indexer reported the hash in a different casing.
    ledger.reconcilePendingSends(ledger.toHashSet(['ABCDEF']));

    expect(ledger.getPendingSends()).toHaveLength(0);
  });

  it('keeps entries whose hash the feed does not know', () => {
    const ledger = freshLedger();
    ledger.addPendingSend(entry('aaa'));
    ledger.addPendingSend(entry('bbb', 'bitcoin'));

    ledger.reconcilePendingSends(ledger.toHashSet(['aaa', 'somethingelse']));

    const all = ledger.getPendingSends();
    expect(all).toHaveLength(1);
    expect(all[0].txHash).toBe('bbb');
  });

  it('expires entries past their chain window', () => {
    const ledger = freshLedger();
    ledger.addPendingSend(entry('old-stellar'));

    // Backdate past Stellar's 10-minute window, straight in storage.
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    stored[0].createdAt = Date.now() - 11 * 60_000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const reloaded = freshLedger();
    expect(reloaded.getPendingSends()).toHaveLength(0);
  });

  it('does NOT expire a Bitcoin send on the same clock', () => {
    const ledger = freshLedger();
    ledger.addPendingSend(entry('slow-btc', 'bitcoin'));

    // 11 minutes is ancient for Stellar but routine for Bitcoin.
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    stored[0].createdAt = Date.now() - 11 * 60_000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const reloaded = freshLedger();
    expect(reloaded.getPendingSends()).toHaveLength(1);
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const ledger = freshLedger();
    let calls = 0;
    const unsubscribe = ledger.subscribePendingSends(() => {
      calls += 1;
    });

    ledger.addPendingSend(entry('abc'));
    expect(calls).toBe(1);

    unsubscribe();
    ledger.addPendingSend(entry('def'));
    expect(calls).toBe(1);
  });

  it('keeps the snapshot referentially stable between mutations', () => {
    // useSyncExternalStore requires getSnapshot to return the SAME reference
    // until something changes, or React loops re-rendering.
    const ledger = freshLedger();
    ledger.addPendingSend(entry('abc'));

    expect(ledger.getPendingSends()).toBe(ledger.getPendingSends());
  });

  it('toHashSet lowercases and drops empty values', () => {
    const ledger = freshLedger();
    const set = ledger.toHashSet(['AbC', null, undefined, '']);

    expect(set.has('abc')).toBe(true);
    expect(set.size).toBe(1);
  });
});

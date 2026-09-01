import { amountsMatch, mergeSavingsSources } from './savings-merge';

import type { VaultDepositInput } from './activity-v2';
import type { ChainSavingsEvent } from './savings-merge';

const T0 = Date.parse('2026-08-01T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function dbRow(over: Partial<VaultDepositInput> = {}): VaultDepositInput {
  return {
    createdAt: new Date(T0),
    walletAddress: 'G1',
    type: 'deposit',
    amount: '100',
    feeAmount: '0.5',
    txHash: 'h1',
    network: 'mainnet',
    ...over,
  };
}

function event(over: Partial<ChainSavingsEvent> = {}): ChainSavingsEvent {
  return { wallet: 'G1', type: 'deposit', amount: 100, timestamp: T0, ...over };
}

describe('amountsMatch — fee-sized drift is the same action', () => {
  it('tolerates 1% (the 0.5% deposit fee) but not more', () => {
    expect(amountsMatch(100, 99.5)).toBe(true);
    expect(amountsMatch(100, 98)).toBe(false);
    expect(amountsMatch(0.05, 0.06)).toBe(true); // absolute floor for dust
  });
});

describe('mergeSavingsSources', () => {
  it('a chain event matching a DB row is absorbed — no double row, fee kept', () => {
    const merged = mergeSavingsSources([dbRow()], [event({ timestamp: T0 + HOUR })], 'mainnet');
    expect(merged).toHaveLength(1);
    expect(merged[0].feeAmount).toBe('0.5');
  });

  it('an unmatched chain event (a direct on-chain withdraw) becomes a fee-0 row', () => {
    const merged = mergeSavingsSources(
      [dbRow()],
      [event(), event({ type: 'withdraw', amount: 5000, timestamp: T0 + DAY })],
      'mainnet'
    );
    expect(merged).toHaveLength(2);
    const extra = merged[1];
    expect(extra).toMatchObject({ type: 'withdraw', amount: '5000', feeAmount: null });
    expect(extra.createdAt.getTime()).toBe(T0 + DAY);
  });

  it('a DB row the events API missed still survives — its fee stays in revenue', () => {
    const merged = mergeSavingsSources([dbRow()], [], 'mainnet');
    expect(merged).toHaveLength(1);
    expect(merged[0].txHash).toBe('h1');
  });

  it('outside the 24h window it is a different action, not a match', () => {
    const merged = mergeSavingsSources([dbRow()], [event({ timestamp: T0 + 3 * DAY })], 'mainnet');
    expect(merged).toHaveLength(2);
  });

  it('two identical deposits on different days each consume their own event', () => {
    const merged = mergeSavingsSources(
      [dbRow(), dbRow({ createdAt: new Date(T0 + 5 * DAY), txHash: 'h2' })],
      [event(), event({ timestamp: T0 + 5 * DAY })],
      'mainnet'
    );
    expect(merged).toHaveLength(2); // both matched, nothing synthetic
  });

  it('never matches across wallets or types', () => {
    const merged = mergeSavingsSources(
      [dbRow()],
      [event({ wallet: 'G2' }), event({ type: 'withdraw' })],
      'mainnet'
    );
    expect(merged).toHaveLength(3);
  });
});

// Pins the #27 settlement logic: a record must always end in a status that
// matches what the chain actually did — and fee-leg-only problems must never
// make a succeeded action look failed.
import type * as TxRecordsModule from '@/server/tx-records';

import { it, jest, expect, describe } from '@jest/globals';

// Mock BEFORE require (repo convention): tx-records imports prisma and the
// Upstash client, neither of which belongs in a unit test — and the
// fee-escrow import chain pulls @normalfinance/utils whose build includes
// jose (ESM) that jest cannot parse.
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/server/rateLimiter', () => ({ redis: {} }));
jest.mock('@normalfinance/utils', () => ({
  getStellarConfigForNetwork: () => ({
    HORIZON_URL: 'https://horizon-testnet.stellar.org',
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const txRecords = require('@/server/tx-records') as typeof TxRecordsModule;

const { decideRecordSettlement, escrowStatusToRecordUpdate, RECORD_ABANDON_AFTER_MS } = txRecords;

const NOW = 1_760_000_000_000;

describe('decideRecordSettlement (#27 reconciler)', () => {
  it('tx found and successful → confirmed', () => {
    expect(
      decideRecordSettlement({ state: 'found', successful: true }, NOW - 120_000, NOW)
    ).toEqual({ status: 'confirmed' });
  });

  it('tx found but failed on-chain → failed', () => {
    expect(
      decideRecordSettlement({ state: 'found', successful: false }, NOW - 120_000, NOW)
    ).toEqual({ status: 'failed' });
  });

  it('tx missing but young → wait (it may still be in flight)', () => {
    expect(decideRecordSettlement({ state: 'not_found' }, NOW - 120_000, NOW)).toEqual({
      status: 'wait',
    });
  });

  it('tx missing past every possible timebound → abandoned', () => {
    expect(
      decideRecordSettlement({ state: 'not_found' }, NOW - RECORD_ABANDON_AFTER_MS - 1000, NOW)
    ).toEqual({ status: 'abandoned' });
  });
});

describe('escrowStatusToRecordUpdate (#26 outcomes → #27 records)', () => {
  it('completed pair → confirmed record', () => {
    expect(escrowStatusToRecordUpdate('completed')).toEqual({ status: 'confirmed' });
  });

  it('service failed on-chain → failed record with reason', () => {
    expect(escrowStatusToRecordUpdate('service_failed')).toMatchObject({ status: 'failed' });
  });

  it('pair superseded by a retry → abandoned, never double-counted', () => {
    expect(escrowStatusToRecordUpdate('superseded')).toMatchObject({ status: 'abandoned' });
  });

  it('nothing ever landed → abandoned', () => {
    expect(escrowStatusToRecordUpdate('abandoned')).toEqual({ status: 'abandoned' });
  });

  it('fee window expired AFTER service success → record still CONFIRMS (the action happened)', () => {
    expect(escrowStatusToRecordUpdate('expired')).toEqual({
      status: 'confirmed',
      reason: 'fee_uncollected',
    });
  });

  it('fee tx failed on-chain after service success → record still CONFIRMS', () => {
    expect(escrowStatusToRecordUpdate('fee_failed')).toEqual({
      status: 'confirmed',
      reason: 'fee_tx_failed',
    });
  });

  it('non-terminal escrow state → nothing to record', () => {
    expect(escrowStatusToRecordUpdate('pending')).toBeNull();
  });
});

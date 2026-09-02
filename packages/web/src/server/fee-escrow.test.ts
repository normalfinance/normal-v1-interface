// The escrow's decision function is the safety-critical core of #26: it is
// what guarantees a fee is submitted exactly when the service succeeded, and
// never otherwise. Pure by design so it can be pinned here without Horizon.
import type * as FeeEscrowModule from '@/server/fee-escrow';

import { it, jest, expect, describe } from '@jest/globals';

// Mock BEFORE require (repo convention — the transform doesn't reliably hoist
// jest.mock): fee-escrow imports the Upstash client from rateLimiter, which
// must not try to talk to Redis from a unit test, and @normalfinance/utils
// whose build pulls jose (ESM) that jest cannot parse.
jest.mock('@/server/rateLimiter', () => ({ redis: {} }));
jest.mock('@normalfinance/utils', () => ({
  getStellarConfigForNetwork: () => ({
    HORIZON_URL: 'https://horizon-testnet.stellar.org',
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { decideEscrowAction } = require('@/server/fee-escrow') as typeof FeeEscrowModule;

type Probe = FeeEscrowModule.TxProbe;

const FOUND_OK: Probe = { state: 'found', successful: true };
const FOUND_FAILED: Probe = { state: 'found', successful: false };
const NOT_FOUND: Probe = { state: 'not_found' };

// Windows: service open until t=100_000, fee until t=900_000.
const entry = { serviceExpiresAtMs: 100_000, feeExpiresAtMs: 900_000 };
const DURING = 50_000; // both windows open
const AFTER_SERVICE = 200_000; // service window closed, fee window open
const AFTER_ALL = 1_000_000; // both closed

describe('decideEscrowAction (#26 fee-pair state machine)', () => {
  it('fee already on chain and successful → the pair is complete', () => {
    expect(decideEscrowAction(entry, FOUND_OK, FOUND_OK, DURING)).toEqual({ type: 'complete' });
  });

  it('fee on chain but FAILED → terminal, flagged for a human', () => {
    expect(decideEscrowAction(entry, FOUND_FAILED, FOUND_OK, DURING)).toEqual({
      type: 'resolve',
      status: 'fee_failed',
    });
  });

  it('service succeeded, fee missing, window open → submit the fee', () => {
    expect(decideEscrowAction(entry, NOT_FOUND, FOUND_OK, DURING)).toEqual({ type: 'submit_fee' });
  });

  it('service succeeded but the fee window closed → the receivable case', () => {
    expect(decideEscrowAction(entry, NOT_FOUND, FOUND_OK, AFTER_ALL)).toEqual({
      type: 'resolve',
      status: 'expired',
    });
  });

  it('service FAILED on-chain → the fee must never be sent', () => {
    expect(decideEscrowAction(entry, NOT_FOUND, FOUND_FAILED, DURING)).toEqual({
      type: 'resolve',
      status: 'service_failed',
    });
  });

  it('neither landed, service window still open → finish the job (submit service)', () => {
    // This is the "execute-pair invocation died after escrow, before submit"
    // case — the user signed both and expects completion.
    expect(decideEscrowAction(entry, NOT_FOUND, NOT_FOUND, DURING)).toEqual({
      type: 'submit_service',
    });
  });

  it('service window closed without landing, fee window still open → wait it out', () => {
    // The service COULD have been accepted just before its deadline and not
    // be visible yet — never jump to "abandoned" while any window is open.
    expect(decideEscrowAction(entry, NOT_FOUND, NOT_FOUND, AFTER_SERVICE)).toEqual({
      type: 'wait',
    });
  });

  it('both windows closed, nothing landed → provably dead, nothing was charged', () => {
    expect(decideEscrowAction(entry, NOT_FOUND, NOT_FOUND, AFTER_ALL)).toEqual({
      type: 'resolve',
      status: 'abandoned',
    });
  });
});

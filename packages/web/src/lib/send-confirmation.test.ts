// Pins the #62 confirmation interpreters — the functions that decide THE
// moment a balance refresh is guaranteed to read fresh data. A wrong
// 'confirmed' fires the refresh early (stale again); a wrong 'failed' tells
// the UI a live send died.
import type * as SendConfirmationModule from '@/lib/send-confirmation';

import { it, jest, expect, describe } from '@jest/globals';

// Mock BEFORE require (repo convention): the RPC-URL import chain pulls
// @normalfinance/utils, whose build includes jose (ESM) that jest can't parse.
jest.mock('@/hooks/use-chain-portfolio', () => ({
  ETH_RPC_URL: 'https://eth.example',
  SOL_RPC_URL: 'https://sol.example',
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sendConfirmation = require('@/lib/send-confirmation') as typeof SendConfirmationModule;

const { interpretSolStatus, interpretEvmReceipt } = sendConfirmation;

describe('interpretEvmReceipt (#62)', () => {
  it('no receipt yet → pending (keep polling)', () => {
    expect(interpretEvmReceipt(null)).toBe('pending');
  });
  it('status 0x1 → confirmed (the refresh moment)', () => {
    expect(interpretEvmReceipt({ status: '0x1' })).toBe('confirmed');
  });
  it('status 0x0 → failed (reverted on-chain)', () => {
    expect(interpretEvmReceipt({ status: '0x0' })).toBe('failed');
  });
});

describe('interpretSolStatus (#62)', () => {
  it('no status yet → pending', () => {
    expect(interpretSolStatus(null)).toBe('pending');
    expect(interpretSolStatus(undefined)).toBe('pending');
  });
  it('processed but not yet confirmed → still pending', () => {
    expect(interpretSolStatus({ confirmationStatus: 'processed' })).toBe('pending');
  });
  it('confirmed or finalized → confirmed', () => {
    expect(interpretSolStatus({ confirmationStatus: 'confirmed' })).toBe('confirmed');
    expect(interpretSolStatus({ confirmationStatus: 'finalized' })).toBe('confirmed');
  });
  it('an err field → failed, even if a confirmation status is present', () => {
    expect(interpretSolStatus({ err: { InstructionError: [0, 'Custom'] } })).toBe('failed');
  });
});

// Pins the #29 send-safety pure logic: the broadcast-error classifier (a
// wrong 'rejected' would terminally mark a live send as failed — a lying
// record), the base58 encoder (a wrong Solana signature string would make the
// reconciler probe a nonexistent tx forever), and the per-chain abandon
// windows.
import type * as SendRecordsModule from '@/server/send-records';

import { it, jest, expect, describe } from '@jest/globals';

// Mock BEFORE require (repo convention): send-records imports prisma, and its
// tx-records import chain pulls the Upstash client and @normalfinance/utils
// (whose build includes jose, which jest cannot parse).
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/server/rateLimiter', () => ({ redis: {} }));
jest.mock('@normalfinance/utils', () => ({
  getStellarConfigForNetwork: () => ({
    HORIZON_URL: 'https://horizon-testnet.stellar.org',
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sendRecords = require('@/server/send-records') as typeof SendRecordsModule;

const {
  base58Encode,
  classifyEvmError,
  EVM_ABANDON_AFTER_MS,
  SOL_ABANDON_AFTER_MS,
  INSUFFICIENT_MESSAGE,
} = sendRecords;

describe('classifyEvmError (#29 — what a broadcast error means for the record)', () => {
  it('"already known" is ACCEPTANCE — a previous attempt made it to the pool', () => {
    expect(classifyEvmError('transaction already known')).toEqual({ outcome: 'accepted' });
    expect(classifyEvmError('AlreadyExists: tx in pool')).toEqual({ outcome: 'accepted' });
  });

  it('insufficient funds → definitive rejection with the friendly message', () => {
    const result = classifyEvmError('insufficient funds for gas * price + value');
    expect(result).toMatchObject({ outcome: 'rejected', friendly: INSUFFICIENT_MESSAGE });
  });

  it('nonce/gas/validity errors → definitive rejection, human wording', () => {
    for (const msg of [
      'nonce too low',
      'replacement transaction underpriced',
      'intrinsic gas too low',
      'exceeds block gas limit',
      'invalid transaction envelope',
    ]) {
      const result = classifyEvmError(msg);
      expect(result.outcome).toBe('rejected');
      if (result.outcome === 'rejected') {
        expect(result.friendly).not.toMatch(/nonce|gas|intrinsic/i);
      }
    }
  });

  it('anything ambiguous is UNKNOWN, never failed — the tx may be live', () => {
    // Marking these 'rejected' would terminally flag a possibly-live send as
    // failed; the reconciler must settle them from the chain instead.
    expect(classifyEvmError('fetch failed')).toEqual({ outcome: 'unknown' });
    expect(classifyEvmError('HTTP request timed out')).toEqual({ outcome: 'unknown' });
    expect(classifyEvmError('socket hang up')).toEqual({ outcome: 'unknown' });
  });
});

describe('base58Encode (#29 — Solana signature string, computed pre-broadcast)', () => {
  it('matches the well-known test vector', () => {
    expect(base58Encode(new TextEncoder().encode('hello world'))).toBe('StV1DL6CwTryKyV');
  });

  it('leading zero bytes become leading 1s (Solana sigs can start with zeros)', () => {
    expect(base58Encode(new Uint8Array([0, 0, 1]))).toBe('112');
  });

  it('a 64-byte signature encodes to the expected length range', () => {
    const sig = new Uint8Array(64).fill(255);
    const encoded = base58Encode(sig);
    // 64 bytes ≈ 87-88 base58 chars — a gross length error would mean a
    // broken encoder probing garbage hashes.
    expect(encoded.length).toBeGreaterThanOrEqual(86);
    expect(encoded.length).toBeLessThanOrEqual(88);
  });
});

describe('abandon windows (#29)', () => {
  it('Solana gives up far sooner than Ethereum — its blockhash expires in ~2 min', () => {
    expect(SOL_ABANDON_AFTER_MS).toBe(10 * 60 * 1000);
    expect(EVM_ABANDON_AFTER_MS).toBe(30 * 60 * 1000);
    expect(SOL_ABANDON_AFTER_MS).toBeLessThan(EVM_ABANDON_AFTER_MS);
  });
});

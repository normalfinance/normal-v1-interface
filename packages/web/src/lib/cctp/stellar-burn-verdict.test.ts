import { it, expect, describe } from '@jest/globals';

import {
  stellarBurnVerdict,
  type StellarTxFacts,
  NEVER_LANDS_AFTER_MS,
  STELLAR_BURN_RETIRED,
} from './stellar-burn-verdict';

// Built from its code point so no dash sits in the source.
const EM_DASH = new RegExp(String.fromCharCode(0x2014));

const created = Date.UTC(2026, 10, 9, 10, 0, 0);
const sec = (ms: number) => Math.floor(ms / 1000);

const facts = (over: Partial<StellarTxFacts> = {}): StellarTxFacts => ({
  status: 'NOT_FOUND',
  latestLedgerCloseTime: sec(created + NEVER_LANDS_AFTER_MS + 60_000),
  oldestLedgerCloseTime: sec(created - 6 * 3600_000),
  horizonFound: false,
  ...over,
});

describe('stellarBurnVerdict', () => {
  it('refused by Stellar: retired', () => {
    expect(stellarBurnVerdict(facts({ status: 'FAILED' }), created)).toBe('failed');
  });

  it('landed: kept, whatever Circle says', () => {
    expect(stellarBurnVerdict(facts({ status: 'SUCCESS' }), created)).toBe('keep');
  });

  it('nowhere, long past its window, history covering its life: never landed', () => {
    expect(stellarBurnVerdict(facts(), created)).toBe('never-landed');
  });

  it('still inside the hour: kept', () => {
    const young = facts({ latestLedgerCloseTime: sec(created + 30 * 60_000) });
    expect(stellarBurnVerdict(young, created)).toBe('keep');
  });

  it('RPC history starts after the row was written: kept (it may be older than what was searched)', () => {
    const short = facts({ oldestLedgerCloseTime: sec(created + 60_000) });
    expect(stellarBurnVerdict(short, created)).toBe('keep');
  });

  it('Horizon has it, or cannot be reached: kept', () => {
    expect(stellarBurnVerdict(facts({ horizonFound: true }), created)).toBe('keep');
    expect(stellarBurnVerdict(facts({ horizonFound: null }), created)).toBe('keep');
  });

  it('no history bounds in the answer: kept', () => {
    expect(stellarBurnVerdict(facts({ oldestLedgerCloseTime: 0 }), created)).toBe('keep');
  });

  it('the words are plain', () => {
    for (const words of Object.values(STELLAR_BURN_RETIRED)) {
      expect(words).not.toMatch(EM_DASH);
      expect(words).toMatch(/never left your wallet/);
    }
  });
});

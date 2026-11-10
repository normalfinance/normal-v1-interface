import { it, expect, describe } from '@jest/globals';

import { EVM_REVERT_FINAL_DEPTH } from './config';
import { evmBurnRevertedDetail, evmBurnRevertedForGood } from './evm-burn-verdict';

// Built from its code point so no dash sits in the source.
const EM_DASH = new RegExp(String.fromCharCode(0x2014));

const DEPTH = EVM_REVERT_FINAL_DEPTH.base;

describe('evmBurnRevertedForGood', () => {
  it('a revert buried deep enough is final', () => {
    const facts = {
      receipt: { status: 'reverted' as const, blockNumber: 1_000n },
      latestBlock: 1_000n + BigInt(DEPTH),
    };
    expect(evmBurnRevertedForGood(facts, DEPTH)).toBe(true);
  });

  it('a fresh revert is not final yet', () => {
    const facts = {
      receipt: { status: 'reverted' as const, blockNumber: 1_000n },
      latestBlock: 1_000n + BigInt(DEPTH - 1),
    };
    expect(evmBurnRevertedForGood(facts, DEPTH)).toBe(false);
  });

  it('a burn that landed is never handed back', () => {
    const facts = {
      receipt: { status: 'success' as const, blockNumber: 1n },
      latestBlock: 1_000_000n,
    };
    expect(evmBurnRevertedForGood(facts, DEPTH)).toBe(false);
  });

  it('no receipt (not mined, or dropped) proves nothing', () => {
    expect(evmBurnRevertedForGood({ receipt: null, latestBlock: 1_000_000n }, DEPTH)).toBe(false);
  });

  it('every chain has a depth', () => {
    expect(EVM_REVERT_FINAL_DEPTH.base).toBeGreaterThan(0);
    expect(EVM_REVERT_FINAL_DEPTH.ethereum).toBeGreaterThan(0);
  });

  it('the words are plain', () => {
    expect(evmBurnRevertedDetail('0xabc')).not.toMatch(EM_DASH);
  });
});

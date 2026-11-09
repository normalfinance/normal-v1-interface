import { it, expect, describe } from '@jest/globals';

import {
  base58,
  isNonceRace,
  sendVerdict,
  settleUncertainSend,
  isBroadcastUncertain,
  BroadcastUncertainError,
} from './broadcast-safety';

type Encode = (b: Uint8Array) => string;

// Built from its code point so no dash sits in the source.
const EM_DASH = new RegExp(String.fromCharCode(0x2014));

const hex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

describe('sendVerdict', () => {
  it('EVM: the node already holding this transaction means it was sent', () => {
    expect(sendVerdict('evm', 'already known')).toBe('sent');
    expect(sendVerdict('evm', 'ALREADY_EXISTS: tx already in pool')).toBe('sent');
    expect(sendVerdict('evm', 'AlreadyKnown')).toBe('sent');
  });

  it('EVM: refusals the node states can be tried again', () => {
    for (const m of [
      'nonce too low',
      'insufficient funds for gas * price + value',
      'intrinsic gas too low',
      'transaction underpriced',
      'invalid sender',
      'max fee per gas less than block base fee',
    ]) {
      expect(sendVerdict('evm', m)).toBe('rejected');
    }
  });

  it('EVM: a timeout or a dropped connection proves nothing', () => {
    expect(sendVerdict('evm', 'The request took too long to respond.')).toBe('unknown');
    expect(sendVerdict('evm', 'HTTP request failed. Status: 502')).toBe('unknown');
    expect(sendVerdict('evm', 'fetch failed')).toBe('unknown');
  });

  it('Solana', () => {
    expect(sendVerdict('solana', 'This transaction has already been processed')).toBe('sent');
    expect(sendVerdict('solana', 'Transaction simulation failed: Blockhash not found')).toBe(
      'rejected'
    );
    expect(sendVerdict('solana', 'failed to send transaction: fetch failed')).toBe('unknown');
  });

  it("Bitcoin: our route's status decides", () => {
    expect(sendVerdict('bitcoin', 'txn-already-in-mempool')).toBe('sent');
    expect(sendVerdict('bitcoin', 'Invalid JSON body', 400)).toBe('rejected');
    expect(sendVerdict('bitcoin', 'every relay rejected', 502)).toBe('rejected');
    expect(sendVerdict('bitcoin', 'Failed to broadcast transaction', 500)).toBe('unknown');
    expect(sendVerdict('bitcoin', 'Failed to fetch')).toBe('unknown');
  });

  it('a nonce race is told apart, so the chain is asked before any re-sign', () => {
    expect(isNonceRace('nonce too low: next nonce 7, tx nonce 6')).toBe(true);
    expect(isNonceRace('replacement transaction underpriced')).toBe(true);
    expect(isNonceRace('already known')).toBe(false);
  });
});

describe('settleUncertainSend', () => {
  const fakeClock = () => {
    let t = 0;
    return { now: () => t, sleep: async (ms: number) => void (t += ms) };
  };

  it('already known to the network: sent, nothing resent', async () => {
    let resent = 0;
    const r = await settleUncertainSend({
      lookup: async () => true,
      resend: async () => {
        resent++;
      },
      verdictOf: () => 'unknown',
      ...fakeClock(),
    });
    expect(r.sent).toBe(true);
    expect(resent).toBe(0);
  });

  it('the same bytes go out on the resend: sent', async () => {
    const r = await settleUncertainSend({
      lookup: async () => false,
      resend: async () => 'txid',
      verdictOf: () => 'unknown',
      ...fakeClock(),
    });
    expect(r).toEqual({ sent: true, resent: 'txid' });
  });

  it('the resend says "already known": sent', async () => {
    const r = await settleUncertainSend({
      lookup: async () => false,
      resend: async () => {
        throw new Error('already known');
      },
      verdictOf: () => 'sent',
      ...fakeClock(),
    });
    expect(r.sent).toBe(true);
  });

  it('it shows up a little later: sent', async () => {
    let calls = 0;
    const r = await settleUncertainSend({
      lookup: async () => ++calls >= 4,
      resend: async () => {
        throw new Error('timeout');
      },
      verdictOf: () => 'unknown',
      ...fakeClock(),
    });
    expect(r.sent).toBe(true);
  });

  it('never seen inside the window: not sent, and it stops looking', async () => {
    let calls = 0;
    const r = await settleUncertainSend({
      lookup: async () => {
        calls++;
        return false;
      },
      resend: async () => {
        throw new Error('timeout');
      },
      verdictOf: () => 'unknown',
      windowMs: 30_000,
      intervalMs: 3_000,
      ...fakeClock(),
    });
    expect(r.sent).toBe(false);
    expect(calls).toBeLessThanOrEqual(12);
  });

  it('a lookup that throws counts as not seen yet', async () => {
    const r = await settleUncertainSend({
      lookup: async () => {
        throw new Error('rpc down');
      },
      resend: async () => {
        throw new Error('rpc down');
      },
      verdictOf: () => 'unknown',
      windowMs: 6_000,
      ...fakeClock(),
    });
    expect(r.sent).toBe(false);
  });
});

describe('BroadcastUncertainError', () => {
  it('carries the chain and the id, and is recognised by name across bundles', () => {
    const e = new BroadcastUncertainError('solana', 'abc');
    expect(isBroadcastUncertain(e)).toBe(true);
    expect(isBroadcastUncertain({ name: 'BroadcastUncertainError' })).toBe(true);
    expect(isBroadcastUncertain(new Error('x'))).toBe(false);
    expect(e.hash).toBe('abc');
    expect(e.message).not.toMatch(EM_DASH);
  });
});

describe('base58', () => {
  // Bitcoin Core's base58 test vectors.
  it.each([
    ['', ''],
    ['61', '2g'],
    ['626262', 'a3gV'],
    ['636363', 'aPEr'],
    ['73696d706c792061206c6f6e6720737472696e67', '2cFupjhnEsSn59qHXstmK2ffpLv2'],
    ['00eb15231dfceb60925886b67d065299925915aeb172c06647', '1NS17iag9jJgTHD1VXjvLCEnZuQ3rJDE9L'],
    ['516b6fcd0f', 'ABnLTmg'],
    ['bf4f89001e670274dd', '3SEo3LWLoPntC'],
    ['572e4794', '3EFU7m'],
    ['ecac89cad93923c02321', 'EJDM8drfXA6uyA'],
    ['10c8511e', 'Rt5zm'],
    ['00000000000000000000', '1111111111'],
  ])('%s', (input, expected) => {
    expect(base58(hex(input))).toBe(expected);
  });

  it('matches bs58 on random 64-byte signatures, leading zeros included', async () => {
    // bs58 is only a dependency of @solana/web3.js here: a reference, not ours.
    const name = 'bs58';
    const mod = (await import(name)) as { default?: { encode: Encode }; encode?: Encode };
    const encode = (mod.default?.encode ?? mod.encode) as Encode;
    for (let i = 0; i < 300; i++) {
      const sig = new Uint8Array(64);
      for (let j = 0; j < 64; j++) sig[j] = Math.floor(Math.random() * 256);
      if (i % 10 === 0) sig[0] = 0;
      if (i % 30 === 0) sig[1] = 0;
      expect(base58(sig)).toBe(encode(sig));
    }
  });
});

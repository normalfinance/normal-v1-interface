import type { Hex } from 'viem';

import { keccak256 } from 'viem';
import { it, expect, describe } from '@jest/globals';

import { sendSignedEvmTransaction } from './evm-send';
import { BroadcastUncertainError } from './broadcast-safety';

const RAW = '0x02f86b0180843b9aca00850218711a0082520894' as Hex;
const OURS = keccak256(RAW);
const noWait = async () => {};

/** A fake node: scripted send answers, and which hashes it knows. */
function node(opts: { sends: (Hex | Error)[]; knows?: (hash: Hex, call: number) => boolean }) {
  let sent = 0;
  let looked = 0;
  return {
    sendCalls: () => sent,
    client: {
      async sendRawTransaction() {
        const next = opts.sends[Math.min(sent, opts.sends.length - 1)];
        sent++;
        if (next instanceof Error) throw next;
        return next;
      },
      async getTransaction({ hash }: { hash: Hex }) {
        looked++;
        if (opts.knows?.(hash, looked)) return { hash };
        throw new Error('TransactionNotFoundError');
      },
    },
  };
}

describe('sendSignedEvmTransaction', () => {
  it('accepted: the node’s hash', async () => {
    const n = node({ sends: [OURS] });
    await expect(
      sendSignedEvmTransaction(n.client, RAW, { chainLabel: 'base', sleep: noWait })
    ).resolves.toEqual({ sent: true, hash: OURS });
  });

  it('"already known" is OUR transaction: sent, never a re-sign', async () => {
    const n = node({ sends: [new Error('already known')] });
    await expect(
      sendSignedEvmTransaction(n.client, RAW, { chainLabel: 'ethereum', sleep: noWait })
    ).resolves.toEqual({ sent: true, hash: OURS });
  });

  it('nonce race held by our own transaction (a lost first answer): sent', async () => {
    const n = node({ sends: [new Error('nonce too low')], knows: (h) => h === OURS });
    await expect(
      sendSignedEvmTransaction(n.client, RAW, { chainLabel: 'base', sleep: noWait })
    ).resolves.toEqual({ sent: true, hash: OURS });
  });

  it('nonce race held by another transaction: the caller may re-sign', async () => {
    const n = node({ sends: [new Error('nonce too low')], knows: () => false });
    const r = await sendSignedEvmTransaction(n.client, RAW, {
      chainLabel: 'base',
      nonceLookupMs: 0,
      sleep: noWait,
    });
    expect(r.sent).toBe(false);
  });

  it('a refusal the node states is thrown, so the page can offer Try again', async () => {
    const n = node({ sends: [new Error('insufficient funds for gas * price + value')] });
    await expect(
      sendSignedEvmTransaction(n.client, RAW, { chainLabel: 'base', sleep: noWait })
    ).rejects.toThrow('insufficient funds');
  });

  it('unclear error, and the same bytes go out on the resend: sent', async () => {
    const n = node({ sends: [new Error('The request took too long to respond.'), OURS] });
    await expect(
      sendSignedEvmTransaction(n.client, RAW, { chainLabel: 'base', sleep: noWait })
    ).resolves.toEqual({ sent: true, hash: OURS });
    expect(n.sendCalls()).toBe(2);
  });

  it('unclear error, then it shows up on the chain: sent', async () => {
    const n = node({
      sends: [new Error('fetch failed')],
      knows: (h, call) => h === OURS && call >= 3,
    });
    await expect(
      sendSignedEvmTransaction(n.client, RAW, { chainLabel: 'base', sleep: noWait })
    ).resolves.toEqual({ sent: true, hash: OURS });
  });

  it('unclear and never seen: "not sure", with our hash, and no re-sign', async () => {
    const n = node({ sends: [new Error('fetch failed')], knows: () => false });
    const err = await sendSignedEvmTransaction(n.client, RAW, {
      chainLabel: 'ethereum',
      windowMs: 0,
      sleep: noWait,
    }).catch((e) => e);
    expect(err).toBeInstanceOf(BroadcastUncertainError);
    expect((err as BroadcastUncertainError).hash).toBe(OURS);
    expect((err as BroadcastUncertainError).chain).toBe('ethereum');
  });
});

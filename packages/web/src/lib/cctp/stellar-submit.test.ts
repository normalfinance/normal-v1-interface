import { it, expect, describe } from '@jest/globals';
import { uncertainBurnHash, isBroadcastUncertain } from '@/lib/chains/broadcast-safety';

import { submitStellarLeg, type StellarTxStatus, type StellarSendStatus } from './stellar-submit';

const noWait = () => Promise.resolve();

/** A scripted node: each send and each status read takes the next answer. */
function node(script: {
  sends: (StellarSendStatus | Error)[];
  statuses?: (StellarTxStatus | Error)[];
}) {
  const sends = [...script.sends];
  const statuses = [...(script.statuses ?? [])];
  let sent = 0;
  return {
    get sendCount() {
      return sent;
    },
    node: {
      send: async () => {
        sent += 1;
        const next = sends.length > 1 ? sends.shift()! : sends[0];
        if (next instanceof Error) throw next;
        return { status: next, detail: next === 'ERROR' ? '{"code":"txFailed"}' : undefined };
      },
      status: async () => {
        const next = statuses.length > 1 ? statuses.shift()! : (statuses[0] ?? 'NOT_FOUND');
        if (next instanceof Error) throw next;
        return next;
      },
    },
  };
}

const run = (n: ReturnType<typeof node>, leg: 'approve' | 'burn', polls = 3) =>
  submitStellarLeg({
    node: n.node,
    hash: 'H',
    leg,
    label: leg === 'burn' ? 'deposit_for_burn' : 'approve',
    sleep: noWait,
    polls,
    settleWindowMs: 0,
  });

describe('submitStellarLeg', () => {
  it('a clean send that lands returns its hash', async () => {
    const n = node({ sends: ['PENDING'], statuses: ['NOT_FOUND', 'SUCCESS'] });
    await expect(run(n, 'burn')).resolves.toBe('H');
  });

  it('a busy node did not take it: the same bytes go again', async () => {
    const n = node({ sends: ['TRY_AGAIN_LATER', 'PENDING'], statuses: ['SUCCESS'] });
    await expect(run(n, 'burn')).resolves.toBe('H');
    expect(n.sendCount).toBe(2);
  });

  it('a node that stays busy: nothing was sent, a plain error', async () => {
    const n = node({ sends: ['TRY_AGAIN_LATER'] });
    const err = await run(n, 'burn').catch((e) => e);
    expect(isBroadcastUncertain(err)).toBe(false);
    expect(String(err.message)).toMatch(/Nothing was sent/);
  });

  it('a refusal is a plain error, never "may still land"', async () => {
    const n = node({ sends: ['ERROR'] });
    const err = await run(n, 'burn').catch((e) => e);
    expect(isBroadcastUncertain(err)).toBe(false);
  });

  it('a burn send with no answer that the network has: followed as sent', async () => {
    const n = node({ sends: [new Error('socket hang up')], statuses: ['SUCCESS'] });
    await expect(run(n, 'burn')).resolves.toBe('H');
  });

  it('a burn send with no answer that nobody can confirm: unclear, tagged as the burn', async () => {
    const n = node({ sends: [new Error('socket hang up'), new Error('socket hang up')] });
    const err = await run(n, 'burn').catch((e) => e);
    expect(isBroadcastUncertain(err)).toBe(true);
    expect(uncertainBurnHash(err)).toBe('H');
  });

  it('an approve send with no answer is a plain error: it moves no money', async () => {
    const n = node({ sends: [new Error('socket hang up')] });
    const err = await run(n, 'approve').catch((e) => e);
    expect(isBroadcastUncertain(err)).toBe(false);
    expect(uncertainBurnHash(err)).toBeNull();
  });

  it('a timed-out approve never hands its hash up as the burn', async () => {
    const n = node({ sends: ['PENDING'], statuses: ['NOT_FOUND'] });
    const err = await run(n, 'approve').catch((e) => e);
    expect(isBroadcastUncertain(err)).toBe(false);
    expect(uncertainBurnHash(err)).toBeNull();
    expect(err.mayStillLand).toBeUndefined();
  });

  it('a timed-out burn is unclear and keeps its hash', async () => {
    const n = node({ sends: ['PENDING'], statuses: ['NOT_FOUND'] });
    const err = await run(n, 'burn').catch((e) => e);
    expect(uncertainBurnHash(err)).toBe('H');
  });

  it('a failed status read after a good send keeps looking', async () => {
    const n = node({ sends: ['PENDING'], statuses: [new Error('503'), 'SUCCESS'] });
    await expect(run(n, 'burn')).resolves.toBe('H');
  });

  it('a burn the network ran and refused is a plain failure with its hash', async () => {
    const n = node({ sends: ['DUPLICATE'], statuses: ['FAILED'] });
    const err = await run(n, 'burn').catch((e) => e);
    expect(isBroadcastUncertain(err)).toBe(false);
    expect(err.txHash).toBe('H');
  });

  it('says when it went out, once', async () => {
    const seen: string[] = [];
    const n = node({ sends: ['TRY_AGAIN_LATER', 'PENDING'], statuses: ['SUCCESS'] });
    await submitStellarLeg({
      node: n.node,
      hash: 'H',
      leg: 'burn',
      label: 'deposit_for_burn',
      sleep: noWait,
      onSubmitted: (h) => seen.push(h),
    });
    expect(seen).toEqual(['H']);
  });
});

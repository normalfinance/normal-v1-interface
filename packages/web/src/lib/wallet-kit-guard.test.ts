// Fresh module per test — the guard's queue is module-level state.
import type * as WalletKitGuardModule from '@/lib/wallet-kit-guard';

import { it, jest, expect, describe, afterEach, beforeEach } from '@jest/globals';

type Guard = typeof WalletKitGuardModule;

function freshGuard(): Guard {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/wallet-kit-guard');
}

const pendingError = () => new Error('A request is already pending.');

describe('runWalletKitSigning (finding #54 — the Lobstr fee-charged incident)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('never has two wallet requests in flight — the second waits', async () => {
    const guard = freshGuard();
    const events: string[] = [];

    let releaseFirst!: () => void;
    const first = guard.runWalletKitSigning(async () => {
      events.push('fee:start');
      await new Promise<void>((r) => {
        releaseFirst = r;
      });
      events.push('fee:end');
      return 'fee-xdr';
    });
    const second = guard.runWalletKitSigning(async () => {
      events.push('deposit:start');
      return 'deposit-xdr';
    });

    await jest.advanceTimersByTimeAsync(2_000);
    // The deposit request MUST NOT start while the fee request is open —
    // WalletConnect would bounce it with "already pending".
    expect(events).toEqual(['fee:start']);
    releaseFirst();
    await jest.advanceTimersByTimeAsync(2_000);

    await expect(first).resolves.toBe('fee-xdr');
    await expect(second).resolves.toBe('deposit-xdr');
    expect(events).toEqual(['fee:start', 'fee:end', 'deposit:start']);
  });

  it('retries once after an already-pending bounce — the exact incident', async () => {
    const guard = freshGuard();
    const sign = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(pendingError()) // session hasn't settled yet
      .mockResolvedValueOnce('signed');

    const result = guard.runWalletKitSigning(sign);
    await jest.advanceTimersByTimeAsync(10_000);

    await expect(result).resolves.toBe('signed');
    expect(sign).toHaveBeenCalledTimes(2);
  });

  it('a jam that survives the retry surfaces instructions, not jargon', async () => {
    const guard = freshGuard();
    const sign = jest.fn<() => Promise<string>>().mockRejectedValue(pendingError());

    const result = guard.runWalletKitSigning(sign);
    result.catch(() => {});
    await jest.advanceTimersByTimeAsync(20_000);

    await expect(result).rejects.toMatchObject({
      message: guard.WALLET_REQUEST_PENDING_MESSAGE,
      cause: expect.objectContaining({ message: expect.stringContaining('already pending') }),
    });
    expect(sign).toHaveBeenCalledTimes(2); // once + one retry, never a loop
  });

  it('other errors (user rejected, session expired) pass through untouched', async () => {
    const guard = freshGuard();
    const rejected = new Error('Request was rejected by the user');
    const sign = jest.fn<() => Promise<string>>().mockRejectedValue(rejected);

    const result = guard.runWalletKitSigning(sign);
    result.catch(() => {});
    await jest.advanceTimersByTimeAsync(10_000);

    // A user's deliberate rejection must NOT be retried or rewritten — and
    // session errors must keep their text so the reconnect snackbar logic
    // downstream still recognises them.
    await expect(result).rejects.toBe(rejected);
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it('a failed request does not wedge the queue for the next one', async () => {
    const guard = freshGuard();
    const first = guard.runWalletKitSigning(() => Promise.reject(new Error('nope')));
    first.catch(() => {});
    const second = guard.runWalletKitSigning(async () => 'ok');

    await jest.advanceTimersByTimeAsync(5_000);
    await expect(second).resolves.toBe('ok');
  });
});

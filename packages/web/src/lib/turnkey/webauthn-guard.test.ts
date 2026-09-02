// Each test gets a fresh module: the guard's queue is module-level state.
import type * as WebauthnGuardModule from '@/lib/turnkey/webauthn-guard';

import { it, jest, expect, describe, afterEach, beforeEach } from '@jest/globals';

type Guard = typeof WebauthnGuardModule;

function freshGuard(): Guard {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/turnkey/webauthn-guard');
}

const notAllowed = () => {
  const e = new Error('The operation either timed out or was not allowed.');
  e.name = 'NotAllowedError';
  return e;
};

describe('runWebauthnCeremony', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('never runs two ceremonies at once — the second waits for the first', async () => {
    const guard = freshGuard();
    const events: string[] = [];

    let releaseFirst!: () => void;
    const first = guard.runWebauthnCeremony(async () => {
      events.push('first:start');
      await new Promise<void>((r) => {
        releaseFirst = r;
      });
      events.push('first:end');
      return 1;
    });
    const second = guard.runWebauthnCeremony(async () => {
      events.push('second:start');
      return 2;
    });

    await jest.advanceTimersByTimeAsync(1_000); // settle delay before first
    expect(events).toEqual(['first:start']); // second MUST NOT have started
    releaseFirst();
    await jest.advanceTimersByTimeAsync(1_000); // settle delay before second

    await expect(first).resolves.toBe(1);
    await expect(second).resolves.toBe(2);
    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('retries once, silently, when the failure was instant (collision noise)', async () => {
    const guard = freshGuard();
    const ceremony = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(notAllowed()) // instant refusal — no human saw it
      .mockResolvedValueOnce('signed');

    const result = guard.runWebauthnCeremony(ceremony);
    await jest.advanceTimersByTimeAsync(5_000);

    await expect(result).resolves.toBe('signed');
    expect(ceremony).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry a slow failure — the user saw the prompt and cancelled', async () => {
    const guard = freshGuard();
    const ceremony = jest.fn<() => Promise<string>>().mockImplementation(async () => {
      // Simulate 10s inside the native dialog before dismissal.
      await new Promise<void>((r) => setTimeout(r, 10_000));
      jest.setSystemTime(Date.now()); // keep Date.now aligned with timers
      throw notAllowed();
    });

    const result = guard.runWebauthnCeremony(ceremony);
    result.catch(() => {}); // avoid unhandled-rejection noise
    await jest.advanceTimersByTimeAsync(60_000);

    await expect(result).rejects.toThrow(guard.WEBAUTHN_FRIENDLY_MESSAGE);
    // Re-prompting after a deliberate cancel is hostile: exactly one attempt.
    expect(ceremony).toHaveBeenCalledTimes(1);
  });

  it('rethrows surviving NotAllowedError with a human-readable message and the original cause', async () => {
    const guard = freshGuard();
    const ceremony = jest.fn<() => Promise<string>>().mockRejectedValue(notAllowed());

    const result = guard.runWebauthnCeremony(ceremony);
    result.catch(() => {});
    await jest.advanceTimersByTimeAsync(10_000);

    await expect(result).rejects.toMatchObject({
      message: guard.WEBAUTHN_FRIENDLY_MESSAGE,
      cause: expect.objectContaining({ name: 'NotAllowedError' }),
    });
    expect(ceremony).toHaveBeenCalledTimes(2); // fast fail → one retry, then give up
  });

  it('passes unrelated errors through untouched, without retrying', async () => {
    const guard = freshGuard();
    const boom = new Error('Turnkey 500');
    const ceremony = jest.fn<() => Promise<string>>().mockRejectedValue(boom);

    const result = guard.runWebauthnCeremony(ceremony);
    result.catch(() => {});
    await jest.advanceTimersByTimeAsync(5_000);

    await expect(result).rejects.toBe(boom);
    expect(ceremony).toHaveBeenCalledTimes(1);
  });

  it('retries once on a network-layer blip (doc 90 W4) — but still not on API errors', async () => {
    const guard = freshGuard();
    const ceremony = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce('signed');

    const result = guard.runWebauthnCeremony(ceremony);
    await jest.advanceTimersByTimeAsync(5_000);

    await expect(result).resolves.toBe('signed');
    expect(ceremony).toHaveBeenCalledTimes(2);
  });

  it('a failed ceremony does not wedge the queue for the next one', async () => {
    const guard = freshGuard();
    const first = guard.runWebauthnCeremony(() => Promise.reject(new Error('nope')));
    first.catch(() => {});
    const second = guard.runWebauthnCeremony(async () => 'ok');

    await jest.advanceTimersByTimeAsync(5_000);
    await expect(second).resolves.toBe('ok');
  });
});

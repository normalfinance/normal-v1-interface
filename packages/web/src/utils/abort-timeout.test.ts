import { abortTimeout } from './abort-timeout';

describe('abortTimeout', () => {
  it('uses the native AbortSignal.timeout when the platform has it', () => {
    // Node (like modern Safari) has it — the helper must not reinvent it.
    const spy = jest.spyOn(AbortSignal, 'timeout');
    const signal = abortTimeout(5_000);
    expect(spy).toHaveBeenCalledWith(5_000);
    expect(signal).toBeInstanceOf(AbortSignal);
    spy.mockRestore();
  });

  it('falls back to a timer-aborted controller when the platform lacks it — Safari < 16', () => {
    jest.useFakeTimers();
    const original = AbortSignal.timeout;
    // Simulate the older-Safari environment where the static does not exist.
    // @ts-expect-error — deliberately removing the platform API
    delete AbortSignal.timeout;
    try {
      const signal = abortTimeout(1_000);
      expect(signal.aborted).toBe(false); // no synchronous TypeError — the old bug
      jest.advanceTimersByTime(999);
      expect(signal.aborted).toBe(false);
      jest.advanceTimersByTime(1);
      expect(signal.aborted).toBe(true);
      expect((signal.reason as DOMException).name).toBe('TimeoutError');
    } finally {
      AbortSignal.timeout = original;
      jest.useRealTimers();
    }
  });
});

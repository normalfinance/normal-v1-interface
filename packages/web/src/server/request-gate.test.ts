// Doc 90 W3: the DeFindex burst-tamer. Pins concurrency + start spacing.
import { createRequestGate } from './request-gate';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('createRequestGate', () => {
  it('bounds concurrency', async () => {
    const gate = createRequestGate({ concurrency: 2, minGapMs: 0 });
    let active = 0;
    let peak = 0;
    const job = async () => {
      active++;
      peak = Math.max(peak, active);
      await wait(20);
      active--;
      return peak;
    };
    await Promise.all([gate.run(job), gate.run(job), gate.run(job), gate.run(job)]);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('spaces call starts by minGapMs', async () => {
    const gate = createRequestGate({ concurrency: 4, minGapMs: 30 });
    const starts: number[] = [];
    const job = async () => {
      starts.push(Date.now());
    };
    await Promise.all([gate.run(job), gate.run(job), gate.run(job)]);
    starts.sort((a, b) => a - b);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(20);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(20);
  });

  it('propagates results and errors, and keeps serving after a failure', async () => {
    const gate = createRequestGate({ concurrency: 1, minGapMs: 0 });
    await expect(gate.run(async () => 42)).resolves.toBe(42);
    await expect(gate.run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(gate.run(async () => 'still alive')).resolves.toBe('still alive');
  });

  it('queued callers run in order', async () => {
    const gate = createRequestGate({ concurrency: 1, minGapMs: 0 });
    const order: number[] = [];
    await Promise.all(
      [1, 2, 3].map((n) =>
        gate.run(async () => {
          order.push(n);
          await wait(5);
        })
      )
    );
    expect(order).toEqual([1, 2, 3]);
  });
});

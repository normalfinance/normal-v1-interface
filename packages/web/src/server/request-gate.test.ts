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
    // Deterministic on purpose. The first version measured the WALL CLOCK and
    // went flaky on a loaded machine (asserted >=20ms, observed 16). The gate
    // takes its clock and sleep as parameters precisely so the spacing rule
    // can be proven exactly instead of timed.
    //
    // The fake sleep RECORDS the wait without advancing the clock: concurrent
    // sleeps overlap in real time, so a shared clock advanced by each sleep
    // would model something that never happens.
    const waits: number[] = [];
    const sleep = async (ms: number) => {
      waits.push(ms);
    };
    const now = () => 1_000_000; // realistic epoch — a 0 clock is never real
    const gate = createRequestGate({ concurrency: 4, minGapMs: 30 }, sleep, now);

    await Promise.all([
      gate.run(async () => 'a'),
      gate.run(async () => 'b'),
      gate.run(async () => 'c'),
    ]);

    // The first call is not held at all (the gate skips sleep when the wait
    // is zero), so only the 2nd and 3rd record a wait — one full gap apart.
    expect(waits).toEqual([30, 60]);
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

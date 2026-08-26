// Doc 90 W3: a tiny upstream-politeness gate. The DeFindex cold load fired
// ~5 calls in one second; each 429'd, each retried once at the same instant,
// and the burst re-tripped the limit. The gate bounds CONCURRENCY and spaces
// call STARTS so a burst becomes a polite queue. Pure module — jest-covered.

export interface RequestGateOptions {
  /** Max calls in flight at once. */
  concurrency: number;
  /** Minimum ms between call STARTS (global, not per-slot). */
  minGapMs: number;
}

export interface RequestGate {
  run<T>(fn: () => Promise<T>): Promise<T>;
}

export function createRequestGate(
  opts: RequestGateOptions,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => number = () => Date.now()
): RequestGate {
  let inFlight = 0;
  let lastStart = 0;
  const waiters: Array<() => void> = [];

  const release = () => {
    inFlight--;
    const next = waiters.shift();
    if (next) next();
  };

  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      if (inFlight >= opts.concurrency) {
        await new Promise<void>((resolve) => waiters.push(resolve));
      }
      inFlight++;
      try {
        // Reserve the start slot SYNCHRONOUSLY: concurrent callers must chain
        // their scheduled starts, not all read the same stale lastStart (the
        // jest spacing test caught exactly that race).
        const nowMs = now();
        const scheduled = Math.max(nowMs, lastStart + opts.minGapMs);
        lastStart = scheduled;
        const wait = scheduled - nowMs;
        if (wait > 0) await sleep(wait);
        return await fn();
      } finally {
        release();
      }
    },
  };
}

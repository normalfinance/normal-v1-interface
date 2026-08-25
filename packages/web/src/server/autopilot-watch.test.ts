import { evaluateRelayerFloat, evaluateAutopilotWindow } from './autopilot-watch';

import type { SignatureRow, WatchThresholds } from './autopilot-watch';

const NOW = new Date('2026-08-24T14:30:00Z').getTime();
const minsAgo = (m: number) => new Date(NOW - m * 60_000);

const row = (over: Partial<SignatureRow> = {}): SignatureRow => ({
  outcome: 'signed',
  amountUsd: 100,
  createdAt: minsAgo(5),
  ...over,
});

const OFF: WatchThresholds = { txUsd: 0, hourlyUsd: 0, refusals: 0 };
const ON: WatchThresholds = { txUsd: 5000, hourlyUsd: 25_000, refusals: 10 };

describe('evaluateAutopilotWindow', () => {
  it('says nothing when no thresholds are configured', () => {
    // Unset must mean OFF, never zero — a threshold of 0 that alerted on
    // everything would train everyone to ignore the channel on day one.
    const rows = [row({ amountUsd: 999_999 }), row({ amountUsd: 50_000 })];
    expect(evaluateAutopilotWindow(rows, OFF, NOW)).toEqual([]);
  });

  it('reports a single leg above the attention line, and says it blocked nothing', () => {
    const alerts = evaluateAutopilotWindow([row({ amountUsd: 8400 })], ON, NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toMatch(/large swap/i);
    expect(alerts[0].fields[0].value).toBe('$8,400.00');
    // The wording matters: the caps were removed deliberately, and nobody
    // should read this alert as "a swap was stopped".
    expect(alerts[0].footer).toMatch(/nothing was blocked/i);
  });

  it('leaves ordinary swaps alone', () => {
    expect(evaluateAutopilotWindow([row({ amountUsd: 118.4 })], ON, NOW)).toEqual([]);
  });

  it('ignores anything older than the tick window', () => {
    // Otherwise every run would re-report the same big swap for an hour.
    const old = row({ amountUsd: 8400, createdAt: minsAgo(40) });
    expect(evaluateAutopilotWindow([old], ON, NOW)).toEqual([]);
  });

  it('gives two different large swaps two different keys', () => {
    const alerts = evaluateAutopilotWindow(
      [
        row({ amountUsd: 8400, createdAt: minsAgo(3) }),
        row({ amountUsd: 9100, createdAt: minsAgo(4) }),
      ],
      ON,
      NOW
    );
    expect(alerts).toHaveLength(2);
    expect(alerts[0].key).not.toBe(alerts[1].key);
  });

  it('raises a critical alert when refusals cluster', () => {
    // One refusal is ordinary. Ten in a window is what probing looks like.
    const refusals = Array.from({ length: 11 }, () => row({ outcome: 'refused-cap' }));
    const alerts = evaluateAutopilotWindow(refusals, ON, NOW);
    const hit = alerts.find((a) => a.key === 'autopilot:refusals');
    expect(hit?.severity).toBe('crit');
    expect(hit?.title).toMatch(/11 refused/);
  });

  it('does not cry probing over a handful of refusals', () => {
    const refusals = Array.from({ length: 3 }, () => row({ outcome: 'refused-expired' }));
    expect(
      evaluateAutopilotWindow(refusals, ON, NOW).find((a) => a.key === 'autopilot:refusals')
    ).toBeUndefined();
  });

  it('sums the whole hour for volume, not just this tick', () => {
    // Many ordinary legs are invisible to a per-transaction line; this is the
    // rule that sees them.
    const rows = Array.from({ length: 30 }, (_, i) =>
      row({ amountUsd: 1000, createdAt: minsAgo(i * 2) })
    );
    const hit = evaluateAutopilotWindow(rows, ON, NOW).find((a) => a.key === 'autopilot:hourly');
    expect(hit?.fields[0].value).toBe('$30,000.00');
  });

  it('reports signing failures with no threshold to configure', () => {
    // A refusal is our own rules saying no; a failure means signing is
    // unhealthy. The expected count is zero, so any is worth saying.
    const alerts = evaluateAutopilotWindow([row({ outcome: 'failed' })], OFF, NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('crit');
  });

  it('ignores legs whose value we cannot measure', () => {
    // An approve moves no funds and carries no amount; it must not be read
    // as a $0 swap or as a large one.
    expect(evaluateAutopilotWindow([row({ amountUsd: null })], ON, NOW)).toEqual([]);
  });
});

describe('evaluateRelayerFloat', () => {
  const ADDR = '0xc88a61BE2D640653978BC481A89D56c4A26a7b43';

  it('stays quiet while the float is healthy', () => {
    expect(evaluateRelayerFloat(0.0108, 0.01, ADDR)).toBeNull();
  });

  it('warns before the float reaches zero, not after', () => {
    const alert = evaluateRelayerFloat(0.0041, 0.01, ADDR);
    expect(alert?.severity).toBe('crit');
    expect(alert?.fields[0].value).toBe('0.0041 ETH');
    expect(alert?.footer).toMatch(/new users cannot complete swaps/i);
  });

  it('is off until a floor is configured', () => {
    expect(evaluateRelayerFloat(0, 0, ADDR)).toBeNull();
  });

  it('never claims a low float from a failed balance read', () => {
    // A dead RPC must not page anyone at 3am about a wallet that is fine.
    expect(evaluateRelayerFloat(NaN, 0.01, ADDR)).toBeNull();
  });
});

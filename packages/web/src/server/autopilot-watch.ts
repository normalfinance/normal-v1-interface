// What in the autopilot's recent activity is worth a human's attention.
//
// Context: the per-transaction and per-day value caps were removed on
// 2026-08-24 so nobody is asked for extra signatures on a large swap (doc 76
// §4). That traded PREVENTION for DETECTION — and the detection did not
// exist: every signature has always been written to autopilot_signatures, and
// nothing has ever read it.
//
// Nothing here blocks anything. These are observations about signatures that
// already happened, so a threshold decides when we LOOK, never what is
// allowed. That distinction is the whole design: the old caps were a lock,
// this is a smoke detector.
//
// Pure on purpose — the route supplies rows and the clock, so every rule
// below is testable without a database, a cron, or a webhook.

import { capEnabled } from './autopilot-caps';

export interface SignatureRow {
  outcome: string;
  amountUsd: number | null;
  createdAt: Date;
}

export interface WatchThresholds {
  /** A single signed leg above this is worth seeing. <= 0 or NaN = off. */
  txUsd: number;
  /** Total signed in the last hour above this is worth seeing. <= 0 = off. */
  hourlyUsd: number;
  /** Refusals in the window at or above this look like probing. <= 0 = off. */
  refusals: number;
}

export interface WatchAlert {
  severity: 'warn' | 'crit';
  /** Stable id so the caller can suppress repeats of the SAME finding. */
  key: string;
  title: string;
  fields: { name: string; value: string }[];
  footer?: string;
  /** How long this finding should stay quiet once reported, in seconds. */
  cooldownSeconds: number;
}

const MINUTE = 60_000;

const usd = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Evaluate one cron tick.
 *  @param rows   signatures from the last hour, any outcome
 *  @param windowMinutes  the tick's own window (the cron interval)
 */
export function evaluateAutopilotWindow(
  rows: SignatureRow[],
  thresholds: WatchThresholds,
  nowMs: number,
  windowMinutes = 15
): WatchAlert[] {
  const alerts: WatchAlert[] = [];
  const windowStart = nowMs - windowMinutes * MINUTE;
  const inWindow = rows.filter((r) => r.createdAt.getTime() >= windowStart);

  // 1. A single large signed leg — the thing the per-transaction cap used to
  //    refuse. Keyed by amount so two different large swaps both report, while
  //    the same one seen twice does not.
  if (capEnabled(thresholds.txUsd)) {
    for (const r of inWindow) {
      if (r.outcome !== 'signed' || !Number.isFinite(r.amountUsd ?? NaN)) continue;
      const amount = r.amountUsd as number;
      if (amount <= thresholds.txUsd) continue;
      alerts.push({
        severity: 'warn',
        key: `autopilot:big:${Math.round(r.createdAt.getTime() / 1000)}:${Math.round(amount)}`,
        title: 'Large swap completed',
        fields: [
          { name: 'Amount', value: usd(amount) },
          { name: 'Attention line', value: usd(thresholds.txUsd) },
        ],
        footer: 'Nothing was blocked — this is a notification, not a limit.',
        cooldownSeconds: 3600,
      });
    }
  }

  // 2. Refusals clustering. One refusal is ordinary (an expired delegation, a
  //    kill-switched deploy). Many in one window is what someone probing a
  //    stolen key looks like from the outside.
  if (capEnabled(thresholds.refusals)) {
    const refused = inWindow.filter((r) => r.outcome.startsWith('refused'));
    if (refused.length >= thresholds.refusals) {
      alerts.push({
        severity: 'crit',
        key: 'autopilot:refusals',
        title: `${refused.length} refused signatures in ${windowMinutes} minutes`,
        fields: [
          { name: 'Refused', value: String(refused.length) },
          { name: 'Threshold', value: String(thresholds.refusals) },
        ],
        footer: 'Repeated refusals can mean a key is being probed — worth looking at now.',
        cooldownSeconds: 1800,
      });
    }
  }

  // 3. Hourly volume. Catches many ordinary-sized legs, which no
  //    per-transaction line would ever see.
  if (capEnabled(thresholds.hourlyUsd)) {
    const total = rows
      .filter((r) => r.outcome === 'signed')
      .reduce(
        (sum, r) => sum + (Number.isFinite(r.amountUsd ?? NaN) ? (r.amountUsd as number) : 0),
        0
      );
    if (total > thresholds.hourlyUsd) {
      alerts.push({
        severity: 'warn',
        key: 'autopilot:hourly',
        title: 'Unusual hour of autopilot volume',
        fields: [
          { name: 'Signed in 1h', value: usd(total) },
          { name: 'Attention line', value: usd(thresholds.hourlyUsd) },
        ],
        cooldownSeconds: 3600,
      });
    }
  }

  // 4. Signing failures. Distinct from a refusal: a refusal is our own rules
  //    saying no, a failure is Turnkey or our signer being unwell. Reported
  //    with no threshold to configure, because the expected count is zero.
  const failed = inWindow.filter((r) => r.outcome === 'failed');
  if (failed.length > 0) {
    alerts.push({
      severity: 'crit',
      key: 'autopilot:failed',
      title: `${failed.length} autopilot signing failure${failed.length === 1 ? '' : 's'}`,
      fields: [{ name: 'Failures', value: String(failed.length) }],
      footer: 'Swaps still complete with normal prompts, but signing is unhealthy.',
      cooldownSeconds: 1800,
    });
  }

  return alerts;
}

/** The company wallet that funds new users' first Base gas. Nothing watched it
 *  before: when it empties, new users simply cannot complete a swap, and we
 *  would hear about it from them rather than from ourselves. */
export function evaluateRelayerFloat(
  balanceEth: number,
  floorEth: number,
  address: string
): WatchAlert | null {
  if (!capEnabled(floorEth) || !Number.isFinite(balanceEth)) return null;
  if (balanceEth >= floorEth) return null;
  return {
    severity: 'crit',
    key: 'relayer:float',
    title: 'Gas float running low',
    fields: [
      { name: 'Balance', value: `${balanceEth.toFixed(4)} ETH` },
      { name: 'Floor', value: `${floorEth.toFixed(4)} ETH` },
      { name: 'Wallet', value: `${address.slice(0, 6)}…${address.slice(-4)}` },
    ],
    footer: 'When this reaches zero, new users cannot complete swaps.',
    cooldownSeconds: 6 * 3600,
  };
}

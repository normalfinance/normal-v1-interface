// ---------------------------------------------------------------------------
// Push notifications — environment and retry POLICY, pure (no Prisma, no
// providers) so it is unit-tested and importable from the sweeps and tests.
// ---------------------------------------------------------------------------

export interface SendPushOutcome {
  attempted: number;
  delivered: number;
  disabledTokens: number;
  skipped: 'kill_switch' | 'no_devices' | null;
}

export function pushKillSwitchOn(): boolean {
  return process.env.PUSH_DISABLED === '1';
}

/**
 * Is at least one provider configured in THIS environment? Production,
 * staging and localhost share one database (docs/audit/02-baseline.md), and
 * the GitHub scheduler pokes staging's crons too. An environment without
 * APNs/FCM credentials must not claim rows — it would burn the notification
 * for production. Treated exactly like the kill switch by every sweep.
 */
export function pushConfigured(): boolean {
  const apns =
    !!process.env.APNS_KEY &&
    !!process.env.APNS_KEY_ID &&
    !!process.env.APNS_TEAM_ID &&
    (!!process.env.APNS_BUNDLE_ID_PROD || !!process.env.APNS_BUNDLE_ID_DEV);
  const fcm = !!process.env.FIREBASE_SERVICE_ACCOUNT;
  return apns || fcm;
}

/** Sweeps run only when sending is possible here and not switched off. */
export function pushActive(): boolean {
  return !pushKillSwitchOn() && pushConfigured();
}

/**
 * Should the sweep give the row back (notifiedAt → null) so the next tick
 * retries? Yes when we tried and nothing was delivered for a reason that can
 * change (transient provider error, unexpected throw). No when every attempt
 * hit a dead token (nothing to retry) or there were no devices at all.
 */
export function shouldUnclaim(outcome: SendPushOutcome): boolean {
  if (outcome.skipped) return false;
  if (outcome.attempted === 0) return false;
  if (outcome.delivered > 0) return false;
  return outcome.disabledTokens < outcome.attempted;
}

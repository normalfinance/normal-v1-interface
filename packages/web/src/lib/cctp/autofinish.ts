// ---------------------------------------------------------------------------
// Server-side inbound finish — the decision half (2026-09-02).
//
// THE GAP THIS CLOSES (proved live the same day): for an inbound swap
// (SOL/BTC/ETH → USDC on Stellar) the browser tab was the only driver of the
// stretch between "USDC arrived on the user's Base address" and "burn fired".
// Autopilot removed the signature PROMPTS, not the DRIVER — so a user who
// closed the tab during "arriving" parked the transfer at CREATED until they
// came back for the banner's one-tap finish. The cron already walked these
// rows every tick (to retire failed source legs) and simply ignored the
// successful ones.
//
// This module decides WHEN the cron may attempt the finish. Pure on purpose:
// the money-moving half (server/autopilot-inbound.ts) is shared with the
// existing autopilot burn route, and this gate is what keeps the cron polite.
// ---------------------------------------------------------------------------

/** The live tab owns the first minutes: an open session runs arrival→burn
 *  itself within moments of the USDC landing, and the cron must not race a
 *  session that is actively working. Only a transfer this stale is presumed
 *  abandoned by its tab. */
export const AUTOFINISH_MIN_AGE_MS = 10 * 60_000;

/** Never surprise-fire an old burn: a row that sat for days (e.g. the
 *  week-old BTC ghost present when this shipped) keeps its money parked at
 *  the user's own address and is finished deliberately via the banner, not
 *  automatically by a deploy. */
export const AUTOFINISH_MAX_AGE_MS = 48 * 3_600_000;

/** ~3 hours of 15-minute cron ticks. A row that failed this many times is
 *  usually a non-autopilot user (their burn cryptographically needs their
 *  passkey — Turnkey rejects the delegate every time); the banner remains
 *  their path and the cron stops burning API calls on it. */
export const AUTOFINISH_MAX_ATTEMPTS = 12;

export interface AutofinishInput {
  /** Age of the transfer row (now − createdAt). */
  ageMs: number;
  /** Attempts so far — the CAS claim increments it per try. */
  retryCount: number;
}

export interface AutofinishDecision {
  attempt: boolean;
  reason: string;
}

export function inboundAutofinishDecision(input: AutofinishInput): AutofinishDecision {
  if (!Number.isFinite(input.ageMs) || input.ageMs < 0) {
    return { attempt: false, reason: 'unusable age' };
  }
  if (input.ageMs < AUTOFINISH_MIN_AGE_MS) {
    return { attempt: false, reason: 'too fresh — the live tab owns it' };
  }
  if (input.ageMs > AUTOFINISH_MAX_AGE_MS) {
    return { attempt: false, reason: 'too old — banner-only, never surprise-fire' };
  }
  if (input.retryCount >= AUTOFINISH_MAX_ATTEMPTS) {
    return { attempt: false, reason: 'attempts exhausted — banner-only' };
  }
  return { attempt: true, reason: 'eligible' };
}

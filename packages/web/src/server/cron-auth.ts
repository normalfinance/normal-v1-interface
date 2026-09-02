// ---------------------------------------------------------------------------
// Doc 95 Wave 7 — a missing secret must not remove the lock.
//
// All four cron routes did this:
//
//   if (CRON_SECRET) { ...check the header... }
//
// which reads as "protected", and is — right up until the variable is absent.
// Then the whole check is skipped and the endpoint is PUBLIC. These routes
// advance bridges, sweep escrowed fees and reconcile ramps: an unset
// environment variable silently turned money-moving endpoints into open ones,
// and nothing anywhere said so.
//
// The rule is the same one as the rest of Wave 6/7: not knowing whether the
// caller is allowed cannot resolve to "let them in".
// ---------------------------------------------------------------------------

export type CronAuthVerdict = { ok: true } | { ok: false; status: 401 | 503; error: string };

/**
 * Pure so it can be tested without a request. `secret` is the configured
 * value (undefined when unset); `header` is the incoming Authorization.
 * `isDev` keeps localhost usable — a developer poking a cron by hand has no
 * secret configured and no production data at risk.
 */
export function cronAuthVerdict(
  secret: string | undefined,
  header: string | null,
  isDev: boolean
): CronAuthVerdict {
  if (!secret) {
    // Deliberately 503, not 401: the caller did nothing wrong, the deployment
    // is misconfigured — and the message has to be loud enough to be fixed
    // rather than retried.
    return isDev
      ? { ok: true }
      : {
          ok: false,
          status: 503,
          error: 'CRON_SECRET is not configured — refusing to run an unauthenticated cron',
        };
  }
  if (header !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}

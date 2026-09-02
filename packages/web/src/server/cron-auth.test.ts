import { cronAuthVerdict } from './cron-auth';

const SECRET = 's3cr3t';

describe('cronAuthVerdict', () => {
  it('accepts the right bearer token', () => {
    expect(cronAuthVerdict(SECRET, `Bearer ${SECRET}`, false)).toEqual({ ok: true });
  });

  it('rejects a wrong or missing token', () => {
    expect(cronAuthVerdict(SECRET, 'Bearer nope', false)).toEqual({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    });
    expect(cronAuthVerdict(SECRET, null, false)).toMatchObject({ ok: false, status: 401 });
  });

  it('REFUSES to run unauthenticated when the secret is not configured', () => {
    // The live shape of the bug: `if (CRON_SECRET) { check }` skipped the
    // whole check when the variable was absent, leaving money-moving
    // endpoints (fee sweep, bridge advance) publicly callable.
    const v = cronAuthVerdict(undefined, null, false);
    expect(v.ok).toBe(false);
    expect(v).toMatchObject({ status: 503 });
  });

  it('refuses even when a caller supplies some token, if none is configured', () => {
    // Guards against "well, they sent something" ever counting as auth.
    expect(cronAuthVerdict(undefined, 'Bearer anything', false).ok).toBe(false);
    expect(cronAuthVerdict('', 'Bearer ', false).ok).toBe(false);
  });

  it('stays usable on a developer machine', () => {
    expect(cronAuthVerdict(undefined, null, true)).toEqual({ ok: true });
  });

  it('still enforces a configured secret in development', () => {
    // Dev leniency covers "no secret set", not "wrong secret sent".
    expect(cronAuthVerdict(SECRET, 'Bearer wrong', true)).toMatchObject({ ok: false, status: 401 });
  });
});

import { it, jest, expect, describe, beforeEach } from '@jest/globals';

// Mocks first, then require: the real chain pulls @supabase/supabase-js → jose,
// which is ESM-only and unparseable to jest (see lib/with-auth.test.ts).
const updateMany = jest.fn<(args: unknown) => Promise<{ count: number }>>();
const deleteMany = jest.fn<(args: unknown) => Promise<{ count: number }>>();
const limit = jest.fn<(id: string) => Promise<{ success: boolean }>>();
const listFactors =
  jest.fn<
    (args: unknown) => Promise<{ data: { factors: { id: string }[] } | null; error: Error | null }>
  >();
const deleteFactor = jest.fn<(args: unknown) => Promise<{ error: Error | null }>>();
const signOut = jest.fn<(jwt: string, scope: string) => Promise<{ error: Error | null }>>();
const invalidateAuthCache = jest.fn();
const getAuthenticatedUser = jest.fn<() => Promise<object | null>>();

let currentToken = 'token';

jest.mock('@/lib/prisma', () => ({ prisma: { mfaRecoveryCode: { updateMany, deleteMany } } }));
jest.mock('@/server/rateLimiter', () => ({ twoFactorRecoverRateLimiter: { limit } }));
jest.mock('@/utils/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/utils/http', () => ({ getAccessToken: () => currentToken }));
jest.mock('@/lib/createSupabaseServerClient', () => ({
  getAuthenticatedUser,
  invalidateAuthCache,
  createSupabaseAdminClient: () => ({
    auth: { admin: { signOut, mfa: { listFactors, deleteFactor } } },
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('./route') as { POST: (req: never) => Promise<Response> };

const CODE = 'ABCD-EFGH-2345-6789';
const halfLogin = `h.${Buffer.from(JSON.stringify({ aal: 'aal1' })).toString('base64url')}.s`;

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/auth/two-factor/recover', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as never
  );

describe('POST /api/auth/two-factor/recover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentToken = halfLogin;
    getAuthenticatedUser.mockResolvedValue({ id: 'user-1', factors: [{ status: 'verified' }] });
    limit.mockResolvedValue({ success: true });
    updateMany.mockResolvedValue({ count: 1 });
    deleteMany.mockResolvedValue({ count: 9 });
    listFactors.mockResolvedValue({ data: { factors: [{ id: 'factor-1' }] }, error: null });
    deleteFactor.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
  });

  it('works for a login that has not entered its 6-digit code: that is its purpose', async () => {
    const res = await post({ code: CODE });

    expect(res.status).toBe(200);
    expect(deleteFactor).toHaveBeenCalledWith({ id: 'factor-1', userId: 'user-1' });
    // No code from this set may outlive the 2FA it belonged to.
    expect(deleteMany).toHaveBeenCalledWith({ where: { supabaseUid: 'user-1' } });
    expect(invalidateAuthCache).toHaveBeenCalledWith(halfLogin);
  });

  it('signs out every session, since the lost device may still be signed in', async () => {
    await post({ code: CODE });

    // Deleting the factor only drops sessions to aal1; it ends none of them.
    expect(signOut).toHaveBeenCalledWith(halfLogin, 'global');
  });

  it('still reports success when the sign-out fails: 2FA is already gone', async () => {
    signOut.mockRejectedValue(new Error('down'));

    const res = await post({ code: CODE });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('refuses without a signed-in user', async () => {
    getAuthenticatedUser.mockResolvedValue(null);

    const res = await post({ code: CODE });

    expect(res.status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('only ever spends a code belonging to the caller, and only an unused one', async () => {
    await post({ code: CODE });

    const { where } = updateMany.mock.calls[0][0] as {
      where: { supabaseUid: string; codeHash: string; usedAt: null };
    };
    expect(where.supabaseUid).toBe('user-1');
    expect(where.usedAt).toBeNull();
    expect(where.codeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a wrong or already-used code changes nothing', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const res = await post({ code: CODE });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_code' });
    expect(deleteFactor).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it.each([[{}], [{ code: 123 }], [{ code: 'short' }], [{ code: '0000-OOOO-1111-IIII' }]])(
    'turns away %j before touching the database',
    async (body) => {
      const res = await post(body);

      expect(res.status).toBe(400);
      expect(updateMany).not.toHaveBeenCalled();
    }
  );

  it('stops at the rate limit before reading the code', async () => {
    limit.mockResolvedValue({ success: false });

    const res = await post({ code: CODE });

    expect(res.status).toBe(429);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('a Supabase outage gives the code back instead of burning it', async () => {
    deleteFactor.mockResolvedValue({ error: new Error('down') });

    const res = await post({ code: CODE });

    expect(res.status).toBe(503);
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany.mock.calls[1][0]).toMatchObject({ data: { usedAt: null } });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});

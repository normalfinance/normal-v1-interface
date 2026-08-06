import { it, jest, expect, describe, beforeEach } from '@jest/globals';

// Explicit mock-then-require ordering, NOT hoisting-dependent: the real
// createSupabaseServerClient pulls @supabase/supabase-js → jose, which is
// ESM-only and unparseable to jest. Registering the mocks first and requiring
// the wrapper after guarantees the real chain never loads, regardless of how
// the transform handles jest.mock hoisting.
jest.mock('@/lib/createSupabaseServerClient', () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock('@/utils/http', () => ({ getAccessToken: () => 'token' }));

const { getAuthenticatedUser } = jest.requireMock('@/lib/createSupabaseServerClient') as {
  getAuthenticatedUser: jest.Mock<() => Promise<{ id: string } | null>>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAuth } = require('@/lib/with-auth') as typeof import('@/lib/with-auth');

const request = new Request('http://localhost/api/test') as never;

describe('withAuth', () => {
  beforeEach(() => {
    getAuthenticatedUser.mockReset();
  });

  it('returns 401 and never runs the handler without a user', async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const handler = jest.fn<() => Promise<Response>>();

    const res = await withAuth(handler as never)(request);

    expect(res.status).toBe(401);
    // The load-bearing promise: unauthenticated requests cannot reach route
    // code at all — the class of bug behind findings #3, C#2 and #44.
    expect(handler).not.toHaveBeenCalled();
  });

  it('hands the verified user to the handler', async () => {
    getAuthenticatedUser.mockResolvedValue({ id: 'user-1' });

    const res = await withAuth(async (_req, { user }) => Response.json({ uid: user.id }))(
      request
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ uid: 'user-1' });
  });

  it('passes dynamic route params through', async () => {
    getAuthenticatedUser.mockResolvedValue({ id: 'user-1' });

    const res = await withAuth(async (_req, { params }) => Response.json({ id: params?.id }))(
      request,
      { params: { id: 'abc' } }
    );

    expect(await res.json()).toEqual({ id: 'abc' });
  });
});

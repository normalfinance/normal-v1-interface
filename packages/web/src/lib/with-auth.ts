import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

// ---------------------------------------------------------------------------
// Authentication as the DEFAULT for API routes, not something each route must
// remember.
//
// Three separate findings were the same bug in different clothes: a route
// born public because nobody added the check (#3 log-transaction, Block C #2
// wallet/activity, #44 broadcast-btc). In Next.js every route handler starts
// life open; this wrapper inverts that. A route written as
//
//   export const POST = withAuth(async (request, { user }) => { ... });
//
// cannot forget authentication — the check runs before the handler and the
// verified Supabase user arrives as an argument. Public routes stay possible,
// but as the visible exception (a bare `export async function GET`), which is
// exactly what review should have to notice.
//
// The verification behind getAuthenticatedUser is the #19 cached/bounded/
// deduplicated path, so the wrapper adds no meaningful latency on top of what
// authed routes already paid.
//
// Route inventory + migration status: docs/audit/50-ci-and-withauth-plan.md.
// ---------------------------------------------------------------------------

type AuthedUser = NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;

export interface AuthedContext {
  user: AuthedUser;
  /** Dynamic segment params for routes like /api/thing/[id]. Empty object on
   *  static routes, so `params.id` reads cleanly where the segment exists. */
  params: Record<string, string>;
  /** The raw bearer token, for the rare route that needs it beyond auth
   *  (e.g. wallets/link compares it against ADMIN_SECRET). */
  accessToken: string | undefined;
}

type AuthedHandler = (request: NextRequest, context: AuthedContext) => Promise<Response> | Response;

export function withAuth(handler: AuthedHandler) {
  return async (
    request: NextRequest,
    routeContext?: { params?: Record<string, string> }
  ): Promise<Response> => {
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(request, { user, params: routeContext?.params ?? {}, accessToken });
  };
}

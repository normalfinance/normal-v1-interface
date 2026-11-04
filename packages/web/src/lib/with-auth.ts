import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';
import {
  needsActionCode,
  needsSecondFactor,
  MFA_REQUIRED_ERROR,
  ACTION_CODE_REQUIRED_ERROR,
  ACTION_CODE_EXPIRED_MESSAGE,
} from '@/lib/auth/two-factor';

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
// Two-factor sign-in is enforced here for the same reason: one check that no
// route can forget. Hiding screens in the browser would stop nobody calling the
// API directly, and the enrol-a-passkey routes are exactly what an attacker
// holding someone's inbox would call.
//
// Route inventory + migration status: docs/audit/50-ci-and-withauth-plan.md.
// ---------------------------------------------------------------------------

type AuthedUser = NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;

export interface AuthedContext {
  user: AuthedUser;
  /** Dynamic segment params for routes like /api/thing/[id]. Empty object on
   *  static routes, so `params.id` reads cleanly where the segment exists. */
  params: Record<string, string>;
  /** The raw bearer token, for the rare route that needs it beyond auth. */
  accessToken: string | undefined;
}

type AuthedHandler = (request: NextRequest, context: AuthedContext) => Promise<Response> | Response;

type WithAuthOptions = {
  /**
   * Lets a login that still owes its 6-digit code through. Only the recovery
   * route may set this (route-auth-conformance enforces it): someone who lost
   * their authenticator has no other way to prove who they are.
   */
  allowPartialLogin?: boolean;
};

export function withAuth(handler: AuthedHandler, options: WithAuthOptions = {}) {
  return async (
    request: NextRequest,
    routeContext?: { params?: Record<string, string> }
  ): Promise<Response> => {
    const accessToken = getAccessToken(request);
    const user = await getAuthenticatedUser(accessToken);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // 403, not 401: this session is valid, and authedFetch treats a 401 as an
    // expired session to refresh and report.
    if (!options.allowPartialLogin && needsSecondFactor(user, accessToken)) {
      return NextResponse.json({ error: MFA_REQUIRED_ERROR }, { status: 403 });
    }
    return handler(request, { user, params: routeContext?.params ?? {}, accessToken });
  };
}

/**
 * The first line of every route that spends. An account with 2FA enters its code
 * before each action, so a token whose code is old never came through that
 * screen. Called in the handler, not an option on withAuth, because some routes
 * only need it for part of what they do. route-auth-conformance lists them.
 */
export function actionCodeRefusal(
  user: AuthedUser,
  accessToken: string | undefined
): Response | null {
  if (!needsActionCode(user, accessToken)) return null;
  return NextResponse.json(
    { success: false, error: ACTION_CODE_EXPIRED_MESSAGE, code: ACTION_CODE_REQUIRED_ERROR },
    { status: 403 }
  );
}

import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { networkFromCookie } from '@/server/network-cookie';
import { PERMISSIONS_ENABLED } from '@/server/relayed-steps';
import { withAuth, actionCodeRefusal } from '@/lib/with-auth';
import { createRelayedAction } from '@/server/relayed-actions';

// Doc 129 Phase 5c: start XLM → Savings or Savings → XLM. The server prices
// it (Stellar's own exchange, the usual fees), builds the person's own
// transactions and the permissions Normal will send, and returns what to sign
// in one prompt. Nothing moves until the signatures come back
// (api/stellar/permissions/commit with this action's id).

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const POST = withAuth(async (request: NextRequest, { user, accessToken }) => {
  if (!PERMISSIONS_ENABLED) return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const refusal = actionCodeRefusal(user, accessToken);
  if (refusal) return refusal;
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const body = await request.json().catch(() => null);
  const network = networkFromCookie(await cookies());
  const out = await createRelayedAction(user.id, network, body);
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
});

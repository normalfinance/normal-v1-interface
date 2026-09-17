import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { isPushToken } from '@/lib/push/messages';
import { rateLimiter } from '@/server/rateLimiter';

// ---------------------------------------------------------------------------
// POST /api/push/unregister — called on sign-out. Deletes the token only if
// it belongs to the caller, so one user cannot silence another's device.
// Body: { token }  → 200 { success: true, removed: 0|1 }
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  if (!body || !isPushToken(body.token)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const { count } = await prisma.pushDevice.deleteMany({
    where: { token: body.token, supabaseUid: user.id },
  });
  return NextResponse.json({ success: true, removed: count });
});

import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { rateLimiter } from '@/server/rateLimiter';
import { isPushToken, isPushPlatform, isPushAppVariant } from '@/lib/push/messages';

// ---------------------------------------------------------------------------
// POST /api/push/register — the app registers (or refreshes) this device's
// push token for the signed-in user.
//
// Body: { token, platform: 'ios'|'android', deviceName?, appVariant: 'dev'|'prod' }
// 200 { success: true }
// 400 { error: 'bad_request' }
//
// Upsert BY TOKEN: a token identifies device+app, not a person. When someone
// else signs in on the same phone the row's supabaseUid is overwritten, so the
// previous user stops receiving that phone's alerts. Re-registering also
// clears a provider-side disable (the token is evidently alive again).
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    platform?: unknown;
    deviceName?: unknown;
    appVariant?: unknown;
  } | null;
  if (
    !body ||
    !isPushToken(body.token) ||
    !isPushPlatform(body.platform) ||
    !isPushAppVariant(body.appVariant)
  ) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const deviceName = typeof body.deviceName === 'string' ? body.deviceName.slice(0, 80) : null;

  await prisma.pushDevice.upsert({
    where: { token: body.token },
    create: {
      token: body.token,
      supabaseUid: user.id,
      platform: body.platform,
      appVariant: body.appVariant,
      deviceName,
    },
    update: {
      supabaseUid: user.id,
      platform: body.platform,
      appVariant: body.appVariant,
      deviceName,
      lastSeenAt: new Date(),
      disabledAt: null,
      disabledReason: null,
    },
  });
  return NextResponse.json({ success: true });
});

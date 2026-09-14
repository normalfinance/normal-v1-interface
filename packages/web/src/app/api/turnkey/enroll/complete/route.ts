import type { NextRequest } from 'next/server';

import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { rateLimiter } from '@/server/rateLimiter';
import { isNonEmptyString } from '@/lib/turnkey/enroll-policy';
import {
  getRootUser,
  findSubOrgId,
  notifyNewDevice,
  recordEnrollment,
} from '@/lib/turnkey/enroll-server';

// ---------------------------------------------------------------------------
// POST /api/turnkey/enroll/complete — step 4: the phone says it registered
// its passkey; we confirm with Turnkey (never trust the client's word), write
// the audit row, and fire the new-device guardrail.
//
// Body: { authenticatorId, deviceName }
// 200 { ok: true, authenticatorCount }
// 404 { error: 'not_found' }   — Turnkey does not list that authenticator
// 409 { error: 'no_wallet' }
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    authenticatorId?: unknown;
    deviceName?: unknown;
  } | null;
  if (!body || !isNonEmptyString(body.authenticatorId, 200)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const deviceName = isNonEmptyString(body.deviceName, 80) ? body.deviceName : 'New device';

  const subOrgId = await findSubOrgId(user.id);
  if (!subOrgId) return NextResponse.json({ error: 'no_wallet' }, { status: 409 });

  try {
    const root = await getRootUser(subOrgId);
    const found = root.authenticators.find((a) => a.authenticatorId === body.authenticatorId);
    if (!found) {
      await recordEnrollment({
        supabaseUid: user.id,
        subOrgId,
        step: 'refused',
        detail: `complete:not_found:${body.authenticatorId}`,
        request,
      });
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    await recordEnrollment({
      supabaseUid: user.id,
      subOrgId,
      step: 'complete',
      detail: `${deviceName} → ${found.authenticatorId}`,
      request,
    });
    await notifyNewDevice({
      supabaseUid: user.id,
      email: root.userEmail,
      deviceName,
      authenticatorId: found.authenticatorId,
    });
    return NextResponse.json({ ok: true, authenticatorCount: root.authenticators.length });
  } catch (e) {
    logger.error('[enroll/complete] failed', e);
    return NextResponse.json({ error: 'turnkey_error' }, { status: 502 });
  }
});

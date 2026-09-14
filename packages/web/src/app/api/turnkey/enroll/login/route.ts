import type { NextRequest } from 'next/server';

import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { turnkey } from '@/lib/turnkey/server';
import { rateLimiter } from '@/server/rateLimiter';
import { getRootUser, findSubOrgId, recordEnrollment } from '@/lib/turnkey/enroll-server';
import {
  isNonEmptyString,
  enrollmentVerdict,
  isClientSignature,
  ENROLL_SESSION_SECONDS,
  isCompressedP256PublicKey,
} from '@/lib/turnkey/enroll-policy';

// ---------------------------------------------------------------------------
// POST /api/turnkey/enroll/login — step 3: turn the verification into a
// short-lived session key on the caller's OWN sub-org
// (ACTIVITY_TYPE_OTP_LOGIN_V2).
//
// Body: { verificationToken, publicKey, clientSignature: { publicKey, scheme,
//         message, signature } }
//   publicKey       — the phone's compressed P-256 session public key
//   clientSignature — the phone's signature over the token id + public key;
//                     the server cannot forge it, which is the point.
// 200 { session, subOrgId, userId }
//   session — Turnkey's session JWT (15 min). The phone now holds an API-key
//   credential and stamps ACTIVITY_TYPE_CREATE_AUTHENTICATORS_V2 for its own
//   passkey DIRECTLY against api.turnkey.com, then discards the key. Signing
//   stays passkey-per-signature.
// 400 { error: 'bad_request' | 'login_failed' }
// 409 { error: 'no_wallet' | 'no_email' | 'email_mismatch' | 'too_many_authenticators' }
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    verificationToken?: unknown;
    publicKey?: unknown;
    clientSignature?: unknown;
  } | null;
  if (
    !body ||
    !isNonEmptyString(body.verificationToken) ||
    !isCompressedP256PublicKey(body.publicKey) ||
    !isClientSignature(body.clientSignature)
  ) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const subOrgId = await findSubOrgId(user.id);
  if (!subOrgId) return NextResponse.json({ error: 'no_wallet' }, { status: 409 });

  try {
    // Re-checked here, not only at init: the cap and the email binding must
    // hold at the moment a session is minted, not minutes earlier.
    const root = await getRootUser(subOrgId);
    const verdict = enrollmentVerdict(user.email, {
      userId: root.userId,
      userEmail: root.userEmail,
      authenticatorCount: root.authenticators.length,
    });
    if (!verdict.ok) {
      await recordEnrollment({
        supabaseUid: user.id,
        subOrgId,
        step: 'refused',
        detail: verdict.error,
        request,
      });
      return NextResponse.json({ error: verdict.error }, { status: 409 });
    }

    const result = await turnkey.apiClient().otpLogin({
      organizationId: subOrgId,
      verificationToken: body.verificationToken,
      publicKey: body.publicKey,
      clientSignature: body.clientSignature,
      expirationSeconds: String(ENROLL_SESSION_SECONDS),
      // One enrolment session at a time per wallet.
      invalidateExisting: true,
    });
    if (!result.session) throw new Error('otpLogin returned no session');

    await recordEnrollment({
      supabaseUid: user.id,
      subOrgId,
      step: 'login',
      detail: `pk:${body.publicKey.slice(0, 12)}…`,
      request,
    });
    return NextResponse.json({ session: result.session, subOrgId, userId: verdict.userId });
  } catch (e) {
    logger.warn('[enroll/login] rejected', e);
    await recordEnrollment({
      supabaseUid: user.id,
      subOrgId,
      step: 'refused',
      detail: 'login_failed',
      request,
    });
    return NextResponse.json({ error: 'login_failed' }, { status: 400 });
  }
});

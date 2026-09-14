import type { NextRequest } from 'next/server';

import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { turnkey } from '@/lib/turnkey/server';
import { rateLimiter } from '@/server/rateLimiter';
import { findSubOrgId, recordEnrollment, turnkeyErrorText } from '@/lib/turnkey/enroll-server';
import { isOtpId, isNonEmptyString, ENROLL_SESSION_SECONDS } from '@/lib/turnkey/enroll-policy';

// ---------------------------------------------------------------------------
// POST /api/turnkey/enroll/verify — step 2: prove the phone holds the code.
//
// Body: { otpId, encryptedOtpBundle }
//   encryptedOtpBundle = @turnkey/crypto encryptOtpCodeToBundle(code,
//   otpEncryptionTargetBundle, phoneSessionPublicKey). The code never reaches
//   this server in the clear; Turnkey's enclave decrypts and checks it
//   (ACTIVITY_TYPE_VERIFY_OTP_V2).
// 200 { verificationToken }        — a JWT, consumed once by ./login
// 400 { error: 'bad_request' | 'invalid_code' }
// 409 { error: 'no_wallet' }
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    otpId?: unknown;
    encryptedOtpBundle?: unknown;
  } | null;
  if (!body || !isOtpId(body.otpId) || !isNonEmptyString(body.encryptedOtpBundle)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const subOrgId = await findSubOrgId(user.id);
  if (!subOrgId) return NextResponse.json({ error: 'no_wallet' }, { status: 409 });

  try {
    const result = await turnkey.apiClient().verifyOtp({
      otpId: body.otpId,
      encryptedOtpBundle: body.encryptedOtpBundle,
      // How long the verification token stays redeemable at ./login.
      expirationSeconds: String(ENROLL_SESSION_SECONDS),
    });
    if (!result.verificationToken) throw new Error('verifyOtp returned no verificationToken');

    await recordEnrollment({
      supabaseUid: user.id,
      subOrgId,
      step: 'verify',
      otpId: body.otpId,
      request,
    });
    return NextResponse.json({ verificationToken: result.verificationToken });
  } catch (e) {
    // Wrong code, expired code, and replayed otpId all land here; Turnkey's
    // message is not for the user. The audit row keeps the otpId.
    const detail = turnkeyErrorText(e);
    logger.warn('[enroll/verify] rejected', detail);
    await recordEnrollment({
      supabaseUid: user.id,
      subOrgId,
      step: 'refused',
      otpId: body.otpId,
      detail: `invalid_code: ${detail}`,
      request,
    });
    return NextResponse.json({ error: 'invalid_code', detail }, { status: 400 });
  }
});

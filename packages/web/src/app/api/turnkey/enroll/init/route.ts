import type { NextRequest } from 'next/server';

import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { turnkey } from '@/lib/turnkey/server';
import { enrollRateLimiter } from '@/server/rateLimiter';
import { enrollmentVerdict } from '@/lib/turnkey/enroll-policy';
import { getRootUser, findSubOrgId, recordEnrollment } from '@/lib/turnkey/enroll-server';

// ---------------------------------------------------------------------------
// POST /api/turnkey/enroll/init — step 1 of enrolling a new device's passkey
// on the caller's EXISTING Turnkey sub-org via email OTP.
//
// Body: {}   (the email is never client-supplied — it is the wallet's own)
// 200 { otpId, otpEncryptionTargetBundle }
// 409 { error: 'no_wallet' | 'no_email' | 'email_mismatch' | 'too_many_authenticators' }
// 429 { error: 'Too many requests' }
// 502 { error: 'turnkey_error' }
//
// The phone encrypts the code it receives to `otpEncryptionTargetBundle`
// (@turnkey/crypto encryptOtpCodeToBundle) and continues at ./verify.
// Custody note + audit trail: lib/turnkey/enroll-policy.ts.
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const { success: withinLimit } = await enrollRateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const subOrgId = await findSubOrgId(user.id);
  if (!subOrgId) return NextResponse.json({ error: 'no_wallet' }, { status: 409 });

  try {
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

    const result = await turnkey.apiClient().initOtp({
      otpType: 'OTP_TYPE_EMAIL',
      contact: verdict.email,
      appName: 'Normal',
      // Per-user key for Turnkey's own rate limiting, on top of ours above.
      userIdentifier: user.id,
      // Six digits, numeric: typed on a phone from a mail on the same phone.
      otpLength: 6,
      alphanumeric: false,
    });
    if (!result.otpId || !result.otpEncryptionTargetBundle) {
      throw new Error('initOtp returned no otpId / target bundle');
    }

    await recordEnrollment({
      supabaseUid: user.id,
      subOrgId,
      step: 'init',
      otpId: result.otpId,
      request,
    });
    return NextResponse.json({
      otpId: result.otpId,
      otpEncryptionTargetBundle: result.otpEncryptionTargetBundle,
    });
  } catch (e) {
    logger.error('[enroll/init] failed', e);
    return NextResponse.json({ error: 'turnkey_error' }, { status: 502 });
  }
});

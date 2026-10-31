import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { twoFactorRecoverRateLimiter } from '@/server/rateLimiter';
import { invalidateAuthCache, createSupabaseAdminClient } from '@/lib/createSupabaseServerClient';
import { isRecoveryCode, hashRecoveryCode, normalizeRecoveryCode } from '@/lib/auth/recovery-codes';

// ---------------------------------------------------------------------------
// POST /api/auth/two-factor/recover — spend a recovery code to remove 2FA.
//
// Body: { code }
// 200 { success: true }             — 2FA is off and every session has ended
// 400 { error: 'invalid_code' }
// 429 { error: 'Too many requests' }
// 503 { error: 'unavailable' }      — nothing changed; the code still works
//
// The ONE route a login may reach before entering its 6-digit code: someone who
// lost their authenticator has nothing else to prove themselves with. It must
// never accept proof that lives in the inbox (a link, an emailed code), because
// a stolen inbox is the attack 2FA exists to stop. Someone who has lost their
// recovery codes as well goes through support, by hand.
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

async function removeTwoFactor(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient().auth.admin.mfa;
  const { data, error } = await admin.listFactors({ userId });
  if (error) throw error;
  await Promise.all(
    (data?.factors ?? []).map(async ({ id }) => {
      const { error: deleteError } = await admin.deleteFactor({ id, userId });
      if (deleteError) throw deleteError;
    })
  );
}

export const POST = withAuth(
  async (request: NextRequest, { user, accessToken }) => {
    const { success: withinLimit } = await twoFactorRecoverRateLimiter.limit(user.id);
    if (!withinLimit) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const code = normalizeRecoveryCode(typeof body?.code === 'string' ? body.code : '');
    if (!isRecoveryCode(code)) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    // Claimed before anything else, so two tabs can't both spend one code.
    const unused = { supabaseUid: user.id, codeHash: hashRecoveryCode(code) };
    const { count } = await prisma.mfaRecoveryCode.updateMany({
      where: { ...unused, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count !== 1) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    try {
      await removeTwoFactor(user.id);
    } catch (error) {
      // A Supabase outage must not cost the person one of their codes.
      await prisma.mfaRecoveryCode.updateMany({ where: unused, data: { usedAt: null } });
      logger.error('[two-factor] recovery failed', { uid: user.id, error });
      return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }

    await prisma.mfaRecoveryCode.deleteMany({ where: { supabaseUid: user.id } });
    if (accessToken) invalidateAuthCache(accessToken);
    logger.warn('[two-factor] removed with a recovery code', { uid: user.id });

    return NextResponse.json({ success: true });
  },
  { allowPartialLogin: true }
);

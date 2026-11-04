import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { rateLimiter } from '@/server/rateLimiter';
import { hasVerifiedFactor } from '@/lib/auth/two-factor';
import { hashRecoveryCode, generateRecoveryCodes } from '@/lib/auth/recovery-codes';

// ---------------------------------------------------------------------------
// /api/auth/two-factor/recovery-codes — the caller's own recovery codes.
//
// GET    200 { remaining }  — unused codes left; the codes themselves are gone
// POST   200 { codes }      — a fresh set, replacing the old one. Shown once.
//        409 { error: 'two_factor_off' }
// DELETE 200 { success }    — after turning 2FA off
//
// withAuth has already refused any login that hasn't entered its 6-digit code,
// so reaching POST on an account with 2FA means the code was entered.
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_request, { user }) => {
  const remaining = await prisma.mfaRecoveryCode.count({
    where: { supabaseUid: user.id, usedAt: null },
  });
  return NextResponse.json({ remaining });
});

export const POST = withAuth(async (_request, { user }) => {
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  if (!hasVerifiedFactor(user)) {
    return NextResponse.json({ error: 'two_factor_off' }, { status: 409 });
  }

  const codes = generateRecoveryCodes();
  await prisma.$transaction([
    prisma.mfaRecoveryCode.deleteMany({ where: { supabaseUid: user.id } }),
    prisma.mfaRecoveryCode.createMany({
      data: codes.map((code) => ({ supabaseUid: user.id, codeHash: hashRecoveryCode(code) })),
    }),
  ]);
  logger.info('[two-factor] recovery codes created', { uid: user.id });

  return NextResponse.json({ codes }, { headers: { 'Cache-Control': 'no-store' } });
});

export const DELETE = withAuth(async (_request, { user }) => {
  await prisma.mfaRecoveryCode.deleteMany({ where: { supabaseUid: user.id } });
  return NextResponse.json({ success: true });
});

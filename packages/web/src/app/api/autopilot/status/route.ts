import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { turnkey } from '@/lib/turnkey/server';
import { autopilotEnabled } from '@/server/autopilot-signer';

// #33 Stage 3: does this user have the autopilot delegation? Truth lives in
// TURNKEY (the delegated user existing on the sub-org), not in our DB — a
// revoke from any surface is immediately authoritative. Engines branch on
// this; the kill-switch masks everything.
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  try {
    if (!autopilotEnabled()) {
      return NextResponse.json({ success: true, active: false, reason: 'disabled' });
    }
    const row = await prisma.turnkeyWallet.findFirst({
      where: { supabaseUid: user.id },
      select: { subOrgId: true },
    });
    if (!row?.subOrgId) {
      return NextResponse.json({ success: true, active: false, reason: 'no-wallet' });
    }
    const { users } = await turnkey.apiClient().getUsers({ organizationId: row.subOrgId });
    const delegate = users.find((u) => u.userName === 'Normal Autopilot');
    // Active = user AND policy. A half-run ceremony (live incident 2026-08-21:
    // user created, policy step never reached) must read as INACTIVE so the
    // Turn on door stays available and the grant flow can finish the job —
    // user-exists alone showed "On" with no policy and no way to repair.
    let hasPolicy = false;
    if (delegate) {
      const { policies } = await turnkey.apiClient().getPolicies({ organizationId: row.subOrgId });
      hasPolicy = policies.some(
        (p) =>
          p.policyName === 'normal-autopilot-base-legs' ||
          (p.consensus ?? '').includes(delegate.userId)
      );
    }
    return NextResponse.json({
      success: true,
      active: !!delegate && hasPolicy,
      // Always returned when the user exists — the grant flow REUSES it
      // (idempotent ceremony) and the revoke flow deletes it.
      autopilotUserId: delegate?.userId ?? null,
      subOrgId: row.subOrgId,
    });
  } catch (e: any) {
    // Unknown ≠ inactive: engines must treat a failed check as "no autopilot"
    // for THIS run (fall back to prompts) without recording a revocation.
    return NextResponse.json({ success: false, error: String(e?.message ?? e) }, { status: 502 });
  }
});

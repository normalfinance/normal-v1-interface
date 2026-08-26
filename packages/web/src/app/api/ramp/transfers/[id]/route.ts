import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { isTerminal, canTransition, RAMP_STATUSES, type RampStatus } from '@/lib/ramp/status';

// Advance one ramp transfer (doc 89 F2). The status machine is enforced HERE,
// not trusted from the client: transitions only move forward, so a delayed or
// replayed PATCH can never un-arrive a settled transfer or resurrect an
// abandoned one.
export const dynamic = 'force-dynamic';

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const id = String(params?.id ?? '');
    const body = await req.json().catch(() => null);
    const to = String(body?.status ?? '') as RampStatus;
    const amountFinal = body?.amountFinal != null ? String(body.amountFinal) : undefined;
    const failureReason = body?.failureReason != null ? String(body.failureReason) : undefined;

    if (!id || !RAMP_STATUSES.includes(to)) {
      return NextResponse.json({ success: false, error: 'Invalid update' }, { status: 400 });
    }

    // Ownership by row: the id is unguessable, but unguessable is not
    // authorization — the row must belong to the caller.
    const row = await prisma.rampTransfer.findFirst({
      where: { id, supabaseUid: user.id },
    });
    if (!row) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const from = row.status as RampStatus;
    if (!canTransition(from, to)) {
      // Not an error worth alarming a client over — a second tab may have
      // advanced the row first. Report the current truth instead.
      return NextResponse.json({ success: true, status: from, unchanged: true });
    }

    const updated = await prisma.rampTransfer.update({
      where: { id: row.id },
      data: {
        status: to,
        ...(amountFinal !== undefined ? { amountFinal } : {}),
        ...(failureReason !== undefined ? { failureReason: failureReason.slice(0, 300) } : {}),
        ...(isTerminal(to) ? { settledAt: new Date() } : {}),
      },
    });
    return NextResponse.json({ success: true, status: updated.status });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: String(e?.message ?? e).slice(0, 200) },
      { status: 500 }
    );
  }
});

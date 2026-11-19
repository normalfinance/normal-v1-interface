import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { relayTransferSteps, PERMISSIONS_ENABLED } from '@/server/relayed-steps';

// Doc 129 Phase 3: the open page asks how its relayed steps stand, and moves
// them on if they can (the same pass the cron makes, for one transfer).

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = withAuth(async (req: Request, { user }) => {
  if (!PERMISSIONS_ENABLED) return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const body = await req.json().catch(() => null);
  const transferId = typeof body?.transferId === 'string' ? body.transferId : '';
  const owned = transferId
    ? await prisma.cctpTransfer.findFirst({
        where: { id: transferId, userId: user.id },
        select: { id: true },
      })
    : null;
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(await relayTransferSteps(transferId));
});

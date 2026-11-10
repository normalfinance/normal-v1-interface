import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { finishIndexPurchase } from '@/server/index-legs';
import { HELD_MARK, INDEX_DIRECTION } from '@/lib/index/legs';

// ---------------------------------------------------------------------------
// POST /api/index/purchases/:id/retry: give a held coin another go. A coin is
// HELD after its exchange route failed LEG_MAX_ATTEMPTS times; its share sits
// as digital dollars at the person's own Base address. This puts it back in
// line with fresh attempts and buys it now. The failed route stays on the leg
// (errorDetail), so the next attempt avoids it.
//
// Nothing new is signed by the person and nothing leaves their own addresses
// except through the same Autopilot policy as the first try, so no action
// code: it is a retry of an action they already confirmed. Only legs whose
// swap never went out can be reset (dstSwapTxHash null): never a second swap.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export const POST = withAuth(async (_req, { user, params }) => {
  const row = await prisma.cctpTransfer.findUnique({
    where: { id: params.id },
    select: { userId: true, direction: true },
  });
  if (!row || row.userId !== user.id || row.direction !== INDEX_DIRECTION) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const reset = await prisma.indexLeg.updateMany({
    where: { purchaseId: params.id, status: 'HELD', dstSwapTxHash: null },
    data: { status: 'PENDING', retryCount: 0 },
  });
  if (reset.count === 0) {
    return NextResponse.json({ ok: false, reason: 'nothing-held' }, { status: 409 });
  }
  // The coin is back in line: the purchase no longer waits for the person
  // (finishIndexPurchase marks it again if a coin is held once more).
  await prisma.cctpTransfer
    .updateMany({
      where: { id: params.id, errorDetail: { startsWith: HELD_MARK } },
      data: { errorDetail: null },
    })
    .catch(() => {});

  const outcome = await finishIndexPurchase(params.id);
  if (!outcome.ok) {
    // The leg is back in line; the cron picks it up if this call could not.
    return NextResponse.json({ ok: true, queued: true, reason: outcome.reason });
  }
  return NextResponse.json({
    ok: true,
    legs: outcome.legs.map((l) => ({ symbol: l.symbol, result: l.result })),
  });
});

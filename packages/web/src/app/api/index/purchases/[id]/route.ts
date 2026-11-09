import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { advanceTransfer } from '@/lib/cctp/state';
import { purchasePhase, INDEX_DIRECTION } from '@/lib/index/legs';

// ---------------------------------------------------------------------------
// GET /api/index/purchases/:id: where a crypto index purchase is. The open
// page polls this: each read also advances the Circle leg (like
// /api/cctp/transfers/:id does), and the legs say which coins are bought.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, { user, params }) => {
  const row = await prisma.cctpTransfer.findUnique({ where: { id: params.id } });
  if (!row || row.userId !== user.id || row.direction !== INDEX_DIRECTION) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const purchase =
    row.status === 'FAILED' || row.status === 'REFUNDED' ? row : await advanceTransfer(row);
  const legs = await prisma.indexLeg.findMany({
    where: { purchaseId: row.id },
    orderBy: { weightBps: 'desc' },
  });

  return NextResponse.json({
    purchase: {
      id: purchase.id,
      status: purchase.status,
      amountWire: purchase.amountWire,
      burnTxHash: purchase.burnTxHash,
      mintTxHash: purchase.mintTxHash,
      destAddress: purchase.destAddress,
      errorDetail: purchase.errorDetail,
      createdAt: purchase.createdAt,
    },
    phase: purchasePhase(purchase, legs),
    legs: legs.map((l) => ({
      id: l.id,
      symbol: l.symbol,
      weightBps: l.weightBps,
      amountWire: l.amountWire,
      status: l.status,
      dstSwapTxHash: l.dstSwapTxHash,
      dstAmount: l.dstAmount,
      // the bridge that failed, never a raw stack
      errorDetail: l.status === 'HELD' || l.status === 'PENDING' ? l.errorDetail : null,
    })),
  });
});

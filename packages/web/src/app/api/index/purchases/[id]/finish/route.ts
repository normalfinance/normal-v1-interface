import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { INDEX_DIRECTION } from '@/lib/index/legs';
import { finishIndexPurchase } from '@/server/index-legs';

// ---------------------------------------------------------------------------
// POST /api/index/purchases/:id/finish: buy the coins now. The open page calls
// it the moment Circle's mint lands; the cron (lib/cctp/state.ts) is the
// closed-tab fallback. Safe to call twice: every leg is claimed by
// compare-and-set before Autopilot signs, and a leg whose swap is out is
// never swapped again (server/index-legs.ts).
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
// Three legs, each an approve + a swap with their receipts, plus gas.
export const maxDuration = 120;

export const POST = withAuth(async (_req, { user, params }) => {
  const row = await prisma.cctpTransfer.findUnique({
    where: { id: params.id },
    select: { userId: true, direction: true },
  });
  if (!row || row.userId !== user.id || row.direction !== INDEX_DIRECTION) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const outcome = await finishIndexPurchase(params.id);
  if (!outcome.ok) {
    const status = outcome.reason === 'not-ready' ? 409 : 400;
    return NextResponse.json({ ok: false, reason: outcome.reason }, { status });
  }
  return NextResponse.json({
    ok: true,
    legs: outcome.legs.map((l) => ({
      symbol: l.symbol,
      result: l.result,
      ...(l.result === 'sent' && { txHash: l.txHash, dstAmount: l.dstAmount }),
      ...(l.result === 'failed' && { held: l.held }),
    })),
  });
});

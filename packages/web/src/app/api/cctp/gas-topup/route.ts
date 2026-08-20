import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
// Dust-gas top-up for the burn chain. In the inbound flow (BTC/ETH/SOL →
// Stellar) the user's swapped USDC lands on Base where they hold zero ETH, so
// the relayer fronts enough gas for their approve + burn/pivot transactions.
// The locked, re-entrant core lives in server/cctp-transfer-gas.ts and is
// shared with the autopilot burn path — this route only adds auth + HTTP.
import { NextResponse } from 'next/server';
import { ensureTransferGas } from '@/server/cctp-transfer-gas';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req: Request, { user }) => {
  const { transferId } = await req.json();
  const transfer = await prisma.cctpTransfer.findUnique({ where: { id: transferId } });
  if (!transfer || transfer.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const result = await ensureTransferGas(transfer.id);
  switch (result.outcome) {
    case 'sent':
      return NextResponse.json({ txHash: result.txHash, amountWei: result.amountWei.toString() });
    case 'skipped':
      return NextResponse.json({ skipped: true, reason: 'recipient already has enough gas' });
    case 'in-progress':
      return NextResponse.json({ error: 'top-up already in progress' }, { status: 409 });
    case 'invalid':
      return NextResponse.json({ error: result.reason }, { status: 400 });
    default:
      return NextResponse.json({ error: 'top-up failed' }, { status: 502 });
  }
});

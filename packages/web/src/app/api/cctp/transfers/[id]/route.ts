import { prisma } from '@/lib/prisma';
// Single CCTP transfer: status reads advance the state machine opportunistically
// (so an open swap UI drives progress even between cron ticks), and PATCH lets
// the client attach tx hashes as it executes its side (burn, source swap).
import { NextResponse } from 'next/server';
import { getAccessToken } from '@/utils/http';
import { advanceTransfer } from '@/lib/cctp/state';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

export const dynamic = 'force-dynamic';

async function loadOwned(req: Request, id: string) {
  const user = await getAuthenticatedUser(getAccessToken(req));
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const transfer = await prisma.cctpTransfer.findUnique({ where: { id } });
  if (!transfer || transfer.userId !== user.id) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  return { transfer };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { transfer, error } = await loadOwned(req, id);
  if (error) return error;

  const fresh = await advanceTransfer(transfer!);
  return NextResponse.json({ transfer: fresh });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { transfer, error } = await loadOwned(req, id);
  if (error) return error;

  const body = await req.json();
  const data: Record<string, unknown> = {};

  // The client may attach its tx hashes exactly once each; never overwrite.
  if (body.burnTxHash && !transfer!.burnTxHash) {
    data.burnTxHash = String(body.burnTxHash);
    data.status = 'BURN_SUBMITTED';
  }
  if (body.srcSwapTxHash && !transfer!.srcSwapTxHash) {
    data.srcSwapTxHash = String(body.srcSwapTxHash);
  }
  if (body.dstSwapTxHash && !transfer!.dstSwapTxHash) {
    data.dstSwapTxHash = String(body.dstSwapTxHash);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  const updated = await prisma.cctpTransfer.update({ where: { id }, data });
  return NextResponse.json({ transfer: updated });
}

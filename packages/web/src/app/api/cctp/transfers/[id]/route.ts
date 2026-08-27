import { prisma } from '@/lib/prisma';
// Single CCTP transfer: status reads advance the state machine opportunistically
// (so an open swap UI drives progress even between cron ticks), and PATCH lets
// the client attach tx hashes as it executes its side (burn, source swap).
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { advanceTransfer } from '@/lib/cctp/state';
import { pivotRevertDetail } from '@/lib/cctp/failure-class';

export const dynamic = 'force-dynamic';

// Auth moved out to withAuth on the handlers; this helper only answers
// "does this transfer exist and belong to this user".
async function loadOwned(userId: string, id: string) {
  const transfer = await prisma.cctpTransfer.findUnique({ where: { id } });
  if (!transfer || transfer.userId !== userId) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  return { transfer };
}

export const GET = withAuth(async (req, { user, params }) => {
  const { transfer, error } = await loadOwned(user.id, params.id);
  if (error) return error;

  // Detail views pass ?noAdvance=1 for a fast read: advancing the state machine
  // makes external calls (Iris / Stellar RPC / mint submit) that can be slow and
  // would hang the modal (and pile up on the dev server). The banner + cron still
  // advance normally, so progress is unaffected.
  const noAdvance = new URL(req.url).searchParams.get('noAdvance') === '1';
  const fresh = noAdvance ? transfer! : await advanceTransfer(transfer!);
  return NextResponse.json({ transfer: fresh });
});

export const PATCH = withAuth(async (req, { user, params }) => {
  const { transfer, error } = await loadOwned(user.id, params.id);
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
  // Delivered amount for the activity feed (set once, when the final leg lands).
  if (body.dstAmount && !transfer!.dstAmount) {
    data.dstAmount = String(body.dstAmount);
  }
  // Doc 95 Wave 5: the CONFIRMED delivered amount, read from the bridge's own
  // status once the destination has it. This one overwrites on purpose — the
  // earlier value is the quote's guaranteed minimum, written before anyone
  // could know the truth, and the set-once rule was freezing that estimate
  // into the activity feed and the Dune dashboard forever.
  if (body.dstAmountFinal && /^\d+(\.\d+)?$/.test(String(body.dstAmountFinal))) {
    data.dstAmount = String(body.dstAmountFinal);
  }
  // A reverted pivot (interactive path) records WHICH bridge failed so the
  // next retry can exclude it — server-formatted from validated slugs, never
  // raw client text. Overwrite is deliberate: the LATEST revert wins.
  if (
    (typeof body.pivotRevertTool === 'string' || typeof body.pivotRevertTxHash === 'string') &&
    transfer!.direction === 'stellar_to_crosschain' &&
    !transfer!.dstSwapTxHash
  ) {
    data.errorDetail = pivotRevertDetail(
      body.pivotRevertTool,
      body.pivotRevertTxHash,
      String(body.pivotRevertExchanges ?? '').split('+')
    );
  }
  // Retire an outbound swap as refunded — its minted USDC was re-bridged to Stellar.
  if (body.markRefunded && transfer!.status !== 'REFUNDED') {
    data.status = 'REFUNDED';
    if (!transfer!.errorDetail)
      data.errorDetail = 'Refunded — USDC is returning to your Stellar wallet (usually ~20 min)';
  }
  // Source-leg refund/failure (scenario sweep 2026-08-21): an inbound LI.FI
  // leg that terminally refunded/failed leaves a row with srcSwapTxHash set
  // and NO bridge leg — the generic markFailed guard below rightly refuses
  // it, so the refund-honesty flow could never retire its row and it sat
  // "pending" forever. This op re-VERIFIES the claim against LI.FI's status
  // API server-side (never trusts the client's verdict) before retiring.
  if (
    body.markSourceRefunded &&
    transfer!.status === 'CREATED' &&
    transfer!.srcSwapTxHash &&
    !transfer!.burnTxHash
  ) {
    try {
      const res = await fetch(
        `https://li.quest/v1/status?txHash=${encodeURIComponent(transfer!.srcSwapTxHash)}`,
        {
          cache: 'no-store',
          signal: AbortSignal.timeout(15_000),
          headers: process.env.LIFI_API_KEY ? { 'x-lifi-api-key': process.env.LIFI_API_KEY } : {},
        }
      );
      if (res.ok) {
        const d = await res.json();
        const st = d?.status as string | undefined;
        const sub = String(d?.substatus ?? '').toUpperCase();
        const terminal =
          st === 'FAILED' ||
          st === 'INVALID' ||
          (st === 'DONE' && (sub === 'REFUNDED' || sub === 'PARTIAL'));
        if (terminal) {
          data.status = 'FAILED';
          if (!transfer!.errorDetail)
            data.errorDetail = 'Source swap refunded or failed — nothing was bridged';
        }
      }
    } catch {
      /* verification unavailable — leave the row pending; the client retries */
    }
  }
  // Retire a transfer that never left the gate (signature declined, build
  // error): allowed ONLY while the row is CREATED with no tx hash on either
  // side — i.e. provably no money moved. Once any hash exists the recovery
  // banner + cron own the row and a client cannot bury it.
  if (
    body.markFailed &&
    transfer!.status === 'CREATED' &&
    !transfer!.burnTxHash &&
    !transfer!.srcSwapTxHash
  ) {
    data.status = 'FAILED';
    if (!transfer!.errorDetail)
      data.errorDetail = 'Cancelled before any transaction was sent — no funds moved';
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  const updated = await prisma.cctpTransfer.update({ where: { id: params.id }, data });
  return NextResponse.json({ transfer: updated });
});

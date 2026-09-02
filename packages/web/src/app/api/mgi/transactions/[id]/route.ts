import { j } from '@/utils/http';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { KNOWN_MGI_STATUSES } from '@/lib/mgi/statuses';

/**
 * PATCH /api/mgi/transactions/[id]
 * Body: { status?: string; externalTransactionId?: string }
 *
 * Status report-back: after a client fetches fresh transaction state from
 * MoneyGram (SEP-10-gated on their side), it mirrors the result into our row
 * so other views/devices see it. Only known SEP-24 statuses are accepted, and
 * only for rows the caller owns.
 */
export const PATCH = withAuth(async (req: Request, { user, params }) => {
  try {
    if (!params.id) return j(400, { error: 'Missing transaction id' });

    const body = (await req.json().catch(() => ({}))) as {
      status?: string;
      externalTransactionId?: string;
    };

    const data: Record<string, string> = {};
    if (body.status) {
      if (!KNOWN_MGI_STATUSES.has(body.status)) {
        return j(400, { error: `Unknown status: ${body.status}` });
      }
      data.status = body.status;
    }
    if (typeof body.externalTransactionId === 'string' && body.externalTransactionId) {
      data.externalTransactionId = body.externalTransactionId;
    }
    if (!Object.keys(data).length) return j(400, { error: 'Nothing to update' });

    // updateMany so the ownership filter is part of the write itself.
    const res = await prisma.moneyGramTransaction.updateMany({
      where: { id: params.id, supabaseUid: user.id },
      data,
    });
    if (!res.count) return j(404, { error: 'Transaction not found' });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return j(500, { error: e?.message || 'Server error' });
  }
});

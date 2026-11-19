import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { PERMISSIONS_ENABLED, commitPermissionSignatures } from '@/server/relayed-steps';

// Doc 129 Phase 3: the signatures for a transfer's permissions. Each is checked
// against the person's own Stellar key before anything is stored as signed;
// then the relayer sends the steps in order, as far as it can within this
// request (the cron finishes the rest).

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = withAuth(async (req: Request, { user }) => {
  if (!PERMISSIONS_ENABLED) return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const body = await req.json().catch(() => null);
  const transferId = typeof body?.transferId === 'string' ? body.transferId : '';
  if (!transferId) return NextResponse.json({ error: 'transferId is required' }, { status: 400 });

  // Doc 129 Phase 5: the person's own transactions that must land before the
  // Circle steps: an XLM → USDC swap (5a), or a Savings withdrawal and its
  // commission (5b, with the amount the Savings record shows).
  const out = await commitPermissionSignatures(
    user.id,
    transferId,
    body?.signatures,
    body?.firstTxs ?? body?.firstTx,
    body?.savingsAmount
  );
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
});

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { PERMISSIONS_ENABLED, preparePermissionBurn } from '@/server/relayed-steps';

// Doc 129 Phase 3: build the permissions for one outbound Circle transfer
// (approve when needed, then the burn) and return the hashes to sign. The
// transfer row exists already (written before anything is signed); every
// address comes from it and from the person's wallet row (server/relayed-steps.ts).

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req: Request, { user }) => {
  if (!PERMISSIONS_ENABLED) return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const body = await req.json().catch(() => null);
  const transferId = typeof body?.transferId === 'string' ? body.transferId : '';
  if (!transferId) return NextResponse.json({ error: 'transferId is required' }, { status: 400 });

  const out = await preparePermissionBurn(user.id, transferId);
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, steps: out.steps });
});

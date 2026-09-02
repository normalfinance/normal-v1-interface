import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';

// ---------------------------------------------------------------------------
// #24 — off-ramp fill tracking, DB-backed.
//
// A fill row = "this user owes the provider an on-chain send for sale
// <providerTxnId>" (txHash null) or "we sent it, hash attached". Previously
// localStorage: clearing the browser or switching devices lost the memory and
// stranded the sale. Rows are scoped to the SESSION USER — no wallet address
// arrives in the body, so there is nothing to spoof.
//
//   GET    → this user's fills
//   POST   { providerTxnId, txHash? }  → upsert claim (txHash omitted) or
//            completion; never downgrades a set txHash back to null
//   DELETE { providerTxnId }           → release a claim (send failed)
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  const fills = await prisma.offrampFill.findMany({
    where: { supabaseUid: user.id },
    select: { providerTxnId: true, txHash: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ success: true, fills });
});

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  const { providerTxnId, txHash } = await request.json();
  if (!isNonEmptyString(providerTxnId)) {
    return NextResponse.json({ success: false, error: 'providerTxnId required' }, { status: 400 });
  }

  await prisma.offrampFill.upsert({
    where: { supabaseUid_providerTxnId: { supabaseUid: user.id, providerTxnId } },
    create: {
      supabaseUid: user.id,
      providerTxnId,
      txHash: isNonEmptyString(txHash) ? txHash : null,
    },
    // A set txHash is history — a late "claim" replay must not erase it.
    update: isNonEmptyString(txHash) ? { txHash } : {},
  });
  return NextResponse.json({ success: true });
});

export const DELETE = withAuth(async (request: NextRequest, { user }) => {
  const { providerTxnId } = await request.json();
  if (!isNonEmptyString(providerTxnId)) {
    return NextResponse.json({ success: false, error: 'providerTxnId required' }, { status: 400 });
  }
  // Releasing is only valid for an unfulfilled claim — a fill with a real
  // txHash records money that MOVED and must never be deleted.
  await prisma.offrampFill.deleteMany({
    where: { supabaseUid: user.id, providerTxnId, txHash: null },
  });
  return NextResponse.json({ success: true });
});

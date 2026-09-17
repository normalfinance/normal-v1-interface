import type { NextRequest } from 'next/server';

import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { lookupLifiStatus } from '@/server/lifi-status';

// ---------------------------------------------------------------------------
// POST /api/lifi/statuses
// Batch status lookup for recorded cross-chain swaps so the activity feed can
// mark them pending until the bridge delivers. Body: { swaps: [{txHash,
// fromSymbol, toSymbol}] } → { statuses: { [txHash]: 'DONE'|'PENDING'|'FAILED' } }.
// Lookup + cache live in server/lifi-status.ts, shared with the push-notify cron.
// ---------------------------------------------------------------------------

// Authed since 2026-08-07: proxies LI.FI with our key; caller is the
// signed-in activity feed.
export const POST = withAuth(async (request: NextRequest) => {
  let body: { swaps?: { txHash: string; fromSymbol: string; toSymbol: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const swaps = (body.swaps ?? []).slice(0, 25);
  const entries = await Promise.all(
    swaps
      .filter((s) => s.txHash)
      .map(
        async (s) => [s.txHash, await lookupLifiStatus(s.txHash, s.fromSymbol, s.toSymbol)] as const
      )
  );

  return NextResponse.json({ success: true, statuses: Object.fromEntries(entries) });
});

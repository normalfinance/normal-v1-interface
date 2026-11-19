// Vercel Cron: advance all in-flight CCTP transfers. This is the safety net —
// the primary driver is the opportunistic advance on client status reads, but
// this tick guarantees progress (attestation pickup, mint execution, reattest)
// even when nobody has the app open. Registered in packages/web/vercel.json.
import { NextResponse } from 'next/server';
import { cronAuthVerdict } from '@/server/cron-auth';
import { notifyTerminalCctp } from '@/lib/push/sweeps';
import { advancePendingTransfers } from '@/lib/cctp/state';
import { advanceRelayedSteps } from '@/server/relayed-steps';
import { recordCronHeartbeat } from '@/server/cron-heartbeat';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  // Doc 95 Wave 7: an UNSET secret used to skip this check entirely, leaving
  // a money-moving endpoint public. cronAuthVerdict fails closed instead.
  const auth = cronAuthVerdict(
    CRON_SECRET,
    req.headers.get('authorization'),
    process.env.NODE_ENV === 'development'
  );
  if (!auth.ok) {
    console.error('[cron] refused:', auth.error);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Doc 129 Phase 3: relayed permissions first, so a burn they land this tick
  // is followed by the advance right after. An error here never stops it.
  const relayed = await advanceRelayedSteps().catch((e) => ({ error: String(e?.message ?? e) }));
  const result = await advancePendingTransfers();
  // Notify right after advancing, so a completion this tick produced reaches
  // the phone now rather than on push-notify's next tick. Claims are CAS, so
  // both crons running is safe; a sweep error must never fail the advance.
  const push = await notifyTerminalCctp().catch((e) => ({ error: String(e?.message ?? e) }));
  const heartbeat = await recordCronHeartbeat('cctp-advance');
  return NextResponse.json({ ...result, relayed, push, heartbeat });
}

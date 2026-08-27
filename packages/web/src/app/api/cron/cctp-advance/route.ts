// Vercel Cron: advance all in-flight CCTP transfers. This is the safety net —
// the primary driver is the opportunistic advance on client status reads, but
// this tick guarantees progress (attestation pickup, mint execution, reattest)
// even when nobody has the app open. Registered in packages/web/vercel.json.
import { NextResponse } from 'next/server';
import { cronAuthVerdict } from '@/server/cron-auth';
import { advancePendingTransfers } from '@/lib/cctp/state';
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

  const result = await advancePendingTransfers();
  const heartbeat = await recordCronHeartbeat('cctp-advance');
  return NextResponse.json({ ...result, heartbeat });
}

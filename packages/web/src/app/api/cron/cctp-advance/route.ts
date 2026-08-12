// Vercel Cron: advance all in-flight CCTP transfers. This is the safety net —
// the primary driver is the opportunistic advance on client status reads, but
// this tick guarantees progress (attestation pickup, mint execution, reattest)
// even when nobody has the app open. Registered in packages/web/vercel.json.
import { NextResponse } from 'next/server';
import { advancePendingTransfers } from '@/lib/cctp/state';
import { recordCronHeartbeat } from '@/server/cron-heartbeat';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await advancePendingTransfers();
  const heartbeat = await recordCronHeartbeat('cctp-advance');
  return NextResponse.json({ ...result, heartbeat });
}

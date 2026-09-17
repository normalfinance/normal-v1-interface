// Cron: push notifications for money that finished moving while the app was
// closed. Reads rows the OTHER crons settled (cctp-advance → cctp_transfers,
// fee-escrow-sweep → send_logs) plus LI.FI swaps it follows itself, claims
// each unnotified terminal row once, and sends. Registered in vercel.json and
// in .github/workflows/cron-scheduler.yml (Vercel crons run on production only).
import { NextResponse } from 'next/server';
import { runPushSweeps } from '@/lib/push/sweeps';
import { cronAuthVerdict } from '@/server/cron-auth';
import { recordCronHeartbeat } from '@/server/cron-heartbeat';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const auth = cronAuthVerdict(
    CRON_SECRET,
    req.headers.get('authorization'),
    process.env.NODE_ENV === 'development'
  );
  if (!auth.ok) {
    console.error('[cron] refused:', auth.error);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await runPushSweeps();
  const heartbeat = await recordCronHeartbeat('push-notify');
  return NextResponse.json({ ...result, heartbeat });
}

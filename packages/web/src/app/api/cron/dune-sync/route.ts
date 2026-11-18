import { NextResponse } from 'next/server';
import { cronAuthVerdict } from '@/server/cron-auth';
import { runMetricsSync } from '@/server/metrics-sync';
import { recordCronHeartbeat } from '@/server/cron-heartbeat';

// ---------------------------------------------------------------------------
// The daily metrics sync behind /dashboard.
//
// The path still says "dune-sync" on purpose: the GitHub cron scheduler calls
// it by this name, and keeping it means no deploy-order window where the
// scheduler calls a path production does not have yet. Since 2026-11-13 it no
// longer uploads to Dune (the free plan ended); it saves one snapshot that
// the /dashboard page reads (server/metrics-sync.ts).
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min: the per-saver DeFindex reads and the balance fan-out

// Called once a day (05:07 UTC) by the GitHub cron scheduler, with the
// secret. It is deliberately NOT in vercel.json: one trigger, one run a day.
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  // Doc 95 Wave 7: an UNSET secret used to skip this check entirely, leaving
  // the endpoint public. cronAuthVerdict fails closed instead.
  const auth = cronAuthVerdict(
    CRON_SECRET,
    req.headers.get('authorization'),
    process.env.NODE_ENV === 'development'
  );
  if (!auth.ok) {
    console.error('[cron] refused:', auth.error);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { results, bytes } = await runMetricsSync();
    const heartbeat = await recordCronHeartbeat('dune-sync');
    return NextResponse.json({ ok: true, results, bytes, heartbeat });
  } catch (e: any) {
    // Only the save itself lands here; a failed source is reported in results.
    console.error('[cron] metrics sync failed:', e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'metrics sync failed' },
      { status: 500 }
    );
  }
}

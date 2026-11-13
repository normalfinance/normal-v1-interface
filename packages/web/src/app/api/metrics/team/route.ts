import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { isTeamEmail } from '@/server/team-access';
import { toTeamSnapshot } from '@/lib/metrics/snapshot';
import { loadMetricsSnapshot } from '@/server/metrics-store';

// ---------------------------------------------------------------------------
// Data for /dashboard/team: the full snapshot (relayer gas, per-wallet
// activity, everything the monthly report needs), minus the internal yield
// ledger. Only for signed-in accounts whose CONFIRMED email is on
// DASHBOARD_TEAM_EMAILS; anyone else gets a 404, so the route does not even
// confirm the data exists.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_request, { user }) => {
  // An unconfirmed address proves nothing: anyone can type a teammate's email.
  if (!user.email_confirmed_at || !isTeamEmail(user.email)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const snapshot = toTeamSnapshot(await loadMetricsSnapshot());
  return NextResponse.json({ snapshot }, { headers: { 'Cache-Control': 'private, no-store' } });
});

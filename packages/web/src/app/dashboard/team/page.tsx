import type { Metadata } from 'next';

import { TeamMetricsView } from '@/sections/metrics/team-view';

// ----------------------------------------------------------------------

// Team only: the data comes from /api/metrics/team, which answers signed-in
// accounts on DASHBOARD_TEAM_EMAILS and nobody else.
export const metadata: Metadata = {
  title: 'Team dashboard | Normal',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function Page() {
  return <TeamMetricsView />;
}

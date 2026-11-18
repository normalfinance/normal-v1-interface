import type { Metadata } from 'next';

import { SiteLayout } from '@/layouts/site';
import { TeamMetricsView } from '@/sections/metrics/team-view';

// ----------------------------------------------------------------------

// Team only: the data comes from /api/metrics/team, which answers signed-in
// accounts on DASHBOARD_TEAM_EMAILS and nobody else. It lives with the app's
// routes because it needs the sign-in providers (app/(wallet)/layout.tsx), and
// wears the marketing site's frame so it reads as the /dashboard's second page.
export const metadata: Metadata = {
  title: 'Team dashboard | Normal',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function Page() {
  return (
    <SiteLayout>
      <TeamMetricsView />
    </SiteLayout>
  );
}

import type { Metadata } from 'next';

import LeaderboardView from '@/sections/indexes/leaderboard';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Index Fund Leaderboard | Normal',
  description: 'Top performing index funds ranked by TVL, deposits, and more.',
};

export default function Page() {
  return <LeaderboardView />;
}

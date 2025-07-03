import type { Metadata } from 'next';

import ExploreView from '@/sections/explore';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Explore',
  description: '',
};

export default function Page() {
  return <ExploreView />;
}

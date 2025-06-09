import ExploreView from '@/sections/explore';
import type { Metadata } from 'next';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Explore',
  description: '',
};

export default function Page() {
  return <ExploreView />;
}

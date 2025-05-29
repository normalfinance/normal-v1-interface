import type { Metadata } from 'next';

import AnalyticsView from '@/sections/analytics';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Analytics',
  description: '',
};

export default function Page() {
  return <AnalyticsView />;
}

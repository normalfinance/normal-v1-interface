import type { Metadata } from 'next';

import OverviewView from '@/sections/overview';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Overview',
  description: '',
};

export default function Page() {
  return <OverviewView />;
}

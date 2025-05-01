import type { Metadata } from 'next';

import OverviewView from '@/sections/overview';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Swap',
  description: '',
};

export default function Page() {
  return <OverviewView />;
}

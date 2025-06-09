import type { Metadata } from 'next';

import PositionsView from '@/sections/positions';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Positions',
  description: '',
};

export default function Page() {
  return <PositionsView />;
}

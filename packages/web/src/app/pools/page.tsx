import type { Metadata } from 'next';

import PoolsView from '@/sections/pools';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Swap',
  description: '',
};

export default function Page() {
  return <PoolsView />;
}

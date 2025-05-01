import type { Metadata } from 'next';

import PoolsView from '@/sections/pools';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Pools',
  description: '',
};

export default function Page() {
  return <PoolsView />;
}

import type { Metadata } from 'next';

import PoolView from '@/sections/pools/[poolAddress]';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Pools',
  description: '',
};

interface PageProps {
  params: { poolAddress: string };
}

export default function Page({ params }: PageProps) {
  return <PoolView poolAddress={params.poolAddress} />;
}

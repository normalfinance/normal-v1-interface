import type { Metadata } from 'next';

import { notFound } from 'next/navigation';
import { indexEnabled } from '@/lib/index/flag';
import { IndexPurchaseView } from '@/sections/crypto-index/purchase-view';

// ----------------------------------------------------------------------

// One index purchase's own page: every step, where the money is, what it needs.
export const metadata: Metadata = {
  title: 'Your purchase | Normal',
  robots: { index: false, follow: false },
};

export default function Page({ params }: { params: { id: string } }) {
  if (!indexEnabled()) notFound();
  return <IndexPurchaseView id={params.id} />;
}

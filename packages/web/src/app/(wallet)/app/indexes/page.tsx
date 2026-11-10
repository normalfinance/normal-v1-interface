import type { Metadata } from 'next';

import { notFound } from 'next/navigation';
import { indexEnabled } from '@/lib/index/flag';
import { IndexesView } from '@/sections/indexes';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Indexes | Normal',
  description: 'Sets of coins you buy in one purchase, with one signature.',
  robots: { index: false, follow: false },
};

export default function IndexesPage() {
  // Off until the team switches it on (lib/index/flag.ts).
  if (!indexEnabled()) notFound();
  return <IndexesView />;
}

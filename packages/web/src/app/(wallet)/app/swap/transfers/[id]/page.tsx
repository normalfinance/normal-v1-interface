import type { Metadata } from 'next';

import { TransferView } from '@/sections/swap/transfer-view';

// ----------------------------------------------------------------------

// One Circle swap's own page: every step, where the money is, what it needs.
export const metadata: Metadata = {
  title: 'Your swap | Normal',
  robots: { index: false, follow: false },
};

export default function Page({ params }: { params: { id: string } }) {
  return <TransferView id={params.id} />;
}

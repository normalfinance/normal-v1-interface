import type { Metadata } from 'next';

import SwapView from '@/sections/swap';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Swap',
  description: '',
};

export default function Page() {
  return <SwapView />;
}

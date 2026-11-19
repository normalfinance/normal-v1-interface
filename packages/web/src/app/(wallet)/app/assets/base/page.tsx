import type { Metadata } from 'next';

import BaseView from '@/sections/assets/base-view';

// ----------------------------------------------------------------------

// Doc 129: what the person's own address on Base holds. A signed-in page,
// never indexed.
export const metadata: Metadata = {
  title: 'On Base',
  description: 'What your own address on Base holds, and why it is there.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BaseView />;
}

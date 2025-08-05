import type { Metadata } from 'next';

import BlockedView from '@/sections/blocked';

export const metadata: Metadata = {
  title: 'Normal | Blocked',
  description: '',
};

export default function Page() {
  return <BlockedView />;
}

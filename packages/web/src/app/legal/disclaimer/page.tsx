import type { Metadata } from 'next';

import DisclaimerView from '@/sections/legal/disclaimer-view';

export const metadata: Metadata = {
  title: 'Normal | Legal - Disclaimer',
  description: '',
};

export default function Page() {
  return <DisclaimerView />;
}

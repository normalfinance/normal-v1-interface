import type { Metadata } from 'next';

import InsuranceView from '@/sections/insurance';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Insurance',
  description: '',
};

export default function Page() {
  return <InsuranceView />;
}

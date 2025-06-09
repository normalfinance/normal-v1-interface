import InsuranceView from '@/sections/insurance';
import { Metadata } from 'next';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Insurance',
  description: '',
};

export default function Page() {
  return <InsuranceView />;
}

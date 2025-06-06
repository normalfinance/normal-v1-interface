import OverviewView from '@/sections/overview';
import { Metadata } from 'next';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Overview',
  description: '',
};

export default function Page() {
  return <OverviewView />;
}

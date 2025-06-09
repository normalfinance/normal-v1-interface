import type { Metadata } from 'next';

import CreatePositionView from '@/sections/positions/create';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Positions - Create',
  description: '',
};

export default function Page() {
  return <CreatePositionView />;
}

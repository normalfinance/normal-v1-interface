import type { Metadata } from 'next';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Normal | Home',
  description: '',
};

export default function Page() {
  return <HomeView />;
}

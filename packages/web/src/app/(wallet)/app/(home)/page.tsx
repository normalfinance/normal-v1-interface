import type { Metadata } from 'next';

import PortfolioView from '@/sections/portfolio';

// ----------------------------------------------------------------------

// A signed-in page: no canonical and no indexing (the app layout sets
// robots to noindex for every page under /app).
export const metadata: Metadata = {
  title: 'Home | Normal',
};

export default function Page() {
  return <PortfolioView />;
}

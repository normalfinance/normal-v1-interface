import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';

import { NotFoundView } from 'src/sections/error';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `404 page not found! | Error - ${CONFIG.appName}` };

export default function Page() {
  return <NotFoundView />;
}

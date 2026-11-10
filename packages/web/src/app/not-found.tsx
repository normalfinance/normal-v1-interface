import type { Metadata } from 'next';

import { CONFIG } from '@/global-config';
import { SiteLayout } from '@/layouts/site';
import { NotFoundView } from '@/sections/error';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `404 page not found! | Error - ${CONFIG.appName}` };

// The root 404 sits outside both route groups, so it brings the site's frame.
export default function Page() {
  return (
    <SiteLayout>
      <NotFoundView />
    </SiteLayout>
  );
}

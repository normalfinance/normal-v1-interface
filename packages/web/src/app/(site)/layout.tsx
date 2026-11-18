import type { ReactNode } from 'react';

import { SiteLayout } from '@/layouts/site';

// ----------------------------------------------------------------------

// The marketing site: its own header and footer, and none of the app's auth or
// wallet code. The app is app/(wallet)/app, under /app.
export default function Layout({ children }: { children: ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}

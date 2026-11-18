import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppShell } from '@/layouts/app';

// ----------------------------------------------------------------------

// Signed-in pages only, so there is nothing here for a search engine.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

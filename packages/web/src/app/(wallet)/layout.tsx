import type { ReactNode } from 'react';

import { AppProviders } from '@/providers/app-providers';

// ----------------------------------------------------------------------

// Everything that needs sign-in and the wallet: the app (/app), the sign-in
// pages and the auth callbacks.
export default function Layout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}

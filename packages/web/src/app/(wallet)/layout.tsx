import type { ReactNode } from 'react';

import { AppProviders } from '@/providers/app-providers';
import { SiteThemeScope } from '@/layouts/site/theme-toggle';

// ----------------------------------------------------------------------

// Everything that needs sign-in and the wallet: the app (/app), the sign-in
// pages and the auth callbacks.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      {/* The visitor's light or dark choice, as on the marketing site. */}
      <SiteThemeScope />
      {children}
    </AppProviders>
  );
}

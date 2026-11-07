'use client';

import type { ReactNode } from 'react';

import { useEffect } from 'react';
import { paths } from '@/routes/paths';
import { isTestnet } from '@normalfinance/utils';
import { loginHrefFrom } from '@/lib/auth/auth-routes';
import { useRouter, usePathname } from '@/routes/hooks';
import { PAPER, roleColor } from '@/theme/brand-colors';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

import { AppLoadingProgress } from '@/components/template/progress-bar/app-loading-progress';

import { AppTopBar } from './app-top-bar';
import { AppSidebar } from './app-sidebar';
import { AppBottomNav, BOTTOM_NAV_HEIGHT } from './app-bottom-nav';

// ----------------------------------------------------------------------

function TestnetNotice() {
  const { tint, deep } = roleColor('highlight');

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.25, bgcolor: tint }}>
      <Typography sx={{ fontSize: 13, lineHeight: 1.5, color: deep }}>
        Testnet: tokens here are not real, and you will meet bugs.{' '}
        <Link
          href={paths.help.feedbackForm}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: 'inherit', fontWeight: 500 }}
        >
          Report one
        </Link>
      </Typography>
    </Box>
  );
}

/**
 * The app's frame, like a bank's online banking: the pages listed on a light
 * grey sidebar, the page itself white with its boxes drawn in hairlines, and
 * tabs on phones.
 *
 * Signed-out visitors go to sign-in and come back here after. The session lives
 * in localStorage, so the server can't see it and this check runs in the
 * browser; the API checks the token on every call regardless.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useSupabaseAuth();

  const signedIn = !isLoading && !!user;

  useEffect(() => {
    if (isLoading || user) return;
    router.replace(loginHrefFrom(pathname, window.location.search));
  }, [isLoading, user, pathname, router]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: PAPER }}>
      <AppLoadingProgress />
      <AppSidebar />

      <Box sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', minWidth: 0 }}>
        <AppTopBar />
        {isTestnet() && <TestnetNotice />}

        <Box
          component="main"
          sx={{
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            pb: { xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`, md: 0 },
          }}
        >
          {signedIn ? children : null}
        </Box>
      </Box>

      <AppBottomNav />
    </Box>
  );
}

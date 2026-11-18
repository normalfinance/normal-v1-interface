'use client';

import type { ReactNode } from 'react';

import { paths } from '@/routes/paths';
import { usePathname } from '@/routes/hooks';
import { RouterLink } from '@/routes/components';
import { INK, HOVER, MUTED, PAPER, CANVAS, INK_SOFT, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';

import { Logo } from '@/components/template/logo';
import { HAIRLINE } from '@/components/_common/brand';

import { REQUEST_LOGOUT_EVENT } from './app-events';
import { APP_NAV_GROUPS, isNavItemActive } from './app-nav';

import type { AppNavItem } from './app-nav';

// ----------------------------------------------------------------------

export const SIDEBAR_WIDTH = 248;

// The current page sits on a white tile with a hairline, lifted off the grey;
// the rest are plain words. Nothing moves.
const rowSx = (active: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 1.25,
  width: '100%',
  height: 36,
  px: 1.25,
  fontSize: 14,
  fontWeight: 500,
  border: '1px solid transparent',
  color: active ? INK : INK_SOFT,
  ...(active && { bgcolor: PAPER, borderColor: HAIRLINE_STRONG }),
  '& svg': { fontSize: 18, color: active ? INK : MUTED },
  '&:hover': { color: INK, ...(!active && { bgcolor: HOVER }), '& svg': { color: INK } },
});

function NavRow({ item, pathname }: { item: AppNavItem; pathname: string }) {
  const active = isNavItemActive(item, pathname);
  const external = item.external
    ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
    : { component: RouterLink, href: item.href };

  return (
    <ButtonBase {...external} aria-current={active ? 'page' : undefined} sx={rowSx(active)}>
      {item.icon}
      {item.title}
    </ButtonBase>
  );
}

/**
 * The desktop sidebar on the light grey, like a bank's online banking: the
 * pages in groups, each group under a small grey label, then log out.
 */
export function AppSidebar({ footer }: { footer?: ReactNode }) {
  const pathname = usePathname();

  return (
    // The grey runs the page's full length; the links inside stay in view.
    <Box
      sx={{
        display: { xs: 'none', md: 'block' },
        flexShrink: 0,
        width: SIDEBAR_WIDTH,
        bgcolor: CANVAS,
        borderRight: HAIRLINE,
      }}
    >
      <Box
        component="nav"
        aria-label="App"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          px: 1.5,
          pb: 2,
          overflowY: 'auto',
        }}
      >
        {/* As tall as the top bar, so the logo lines up with its contents. */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, height: 64, px: 1.25 }}>
          <Logo href={paths.portfolio} sx={{ width: 28, height: 28 }} />
        </Box>

        {APP_NAV_GROUPS.map((group) => (
          <Box key={group.title ?? 'main'} sx={{ mt: group.title ? 3 : 1.5 }}>
            {group.title && (
              <Typography
                component="h2"
                sx={{ px: 1.25, mb: 0.75, fontSize: 12.5, fontWeight: 500, color: MUTED }}
              >
                {group.title}
              </Typography>
            )}
            <Box component="ul" sx={{ display: 'grid', gap: '2px' }}>
              {group.items.map((item) => (
                <li key={item.title}>
                  <NavRow item={item} pathname={pathname} />
                </li>
              ))}
            </Box>
          </Box>
        ))}

        <Box sx={{ flexGrow: 1 }} />

        {footer}

        <ButtonBase
          onClick={() => window.dispatchEvent(new CustomEvent(REQUEST_LOGOUT_EVENT))}
          sx={rowSx(false)}
        >
          <LogoutOutlined />
          Log out
        </ButtonBase>
      </Box>
    </Box>
  );
}

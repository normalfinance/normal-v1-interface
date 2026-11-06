'use client';

import type { ReactNode } from 'react';

import { paths } from '@/routes/paths';
import { usePathname } from '@/routes/hooks';
import { RouterLink } from '@/routes/components';
import { INK, MUTED, PAPER, CANVAS, INK_SOFT } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';

import { Logo } from '@/components/template/logo';
import { HAIRLINE } from '@/components/_common/brand';

import { REQUEST_LOGOUT_EVENT } from './app-events';
import { APP_NAV_MAIN, isNavItemActive, APP_NAV_SECONDARY } from './app-nav';

import type { AppNavItem } from './app-nav';

// ----------------------------------------------------------------------

export const SIDEBAR_WIDTH = 240;

const rowSx = (active: boolean) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 1.5,
  width: '100%',
  height: 44,
  px: 1.5,
  fontSize: 15,
  fontWeight: 500,
  borderRadius: 'var(--radius-md)',
  color: active ? INK : INK_SOFT,
  bgcolor: active ? CANVAS : 'transparent',
  '& svg': { fontSize: 20, color: active ? INK : MUTED },
  '&:hover': { bgcolor: CANVAS, color: INK, '& svg': { color: INK } },
  // The current page: a soft fill and an ink bar on the leading edge. Nothing moves.
  ...(active && {
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 10,
      bottom: 10,
      width: 2,
      borderRadius: 'var(--radius-xs)',
      bgcolor: INK,
    },
  }),
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

function NavGroup({ items, pathname }: { items: AppNavItem[]; pathname: string }) {
  return (
    <Box component="ul" sx={{ display: 'grid', gap: 0.5 }}>
      {items.map((item) => (
        <li key={item.title}>
          <NavRow item={item} pathname={pathname} />
        </li>
      ))}
    </Box>
  );
}

/** The desktop sidebar: the app's pages, then settings and help, then log out. */
export function AppSidebar({ footer }: { footer?: ReactNode }) {
  const pathname = usePathname();

  return (
    <Box
      component="nav"
      aria-label="App"
      sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        width: SIDEBAR_WIDTH,
        height: '100vh',
        px: 2,
        py: 3,
        overflowY: 'auto',
        bgcolor: PAPER,
        borderRight: HAIRLINE,
      }}
    >
      <Box sx={{ px: 1.5, mb: 4 }}>
        <Logo href={paths.portfolio} sx={{ width: 32, height: 32 }} />
      </Box>

      <NavGroup items={APP_NAV_MAIN} pathname={pathname} />
      <Box sx={{ my: 2, borderTop: HAIRLINE }} />
      <NavGroup items={APP_NAV_SECONDARY} pathname={pathname} />

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
  );
}

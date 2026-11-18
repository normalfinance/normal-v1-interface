'use client';

import { usePathname } from '@/routes/hooks';
import { indexEnabled } from '@/lib/index/flag';
import { RouterLink } from '@/routes/components';
import { INK, MUTED, PAPER } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';

import { HAIRLINE } from '@/components/_common/brand';

import { INDEXES_NAV, APP_NAV_MAIN, isNavItemActive } from './app-nav';

import type { AppNavItem } from './app-nav';

// ----------------------------------------------------------------------

export const BOTTOM_NAV_HEIGHT = 64;

// Home, Assets, Indexes (where switched on), Savings, Activity: the places.
// Moving money is an action, not a place: it lives in the top bar's Move money
// and Home's tiles, so no tab is a filled button (Niko 2026-11-09).
const [HOME, ASSETS, ACTIVITY, SAVINGS] = APP_NAV_MAIN;

function Tab({ item, pathname }: { item: AppNavItem; pathname: string }) {
  const active = isNavItemActive(item, pathname);

  return (
    <ButtonBase
      component={RouterLink}
      href={item.href}
      aria-current={active ? 'page' : undefined}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        height: '100%',
        minWidth: 0,
        fontSize: 11,
        fontWeight: 500,
        color: active ? INK : MUTED,
        '& svg': { fontSize: 24 },
        '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: -4 },
      }}
    >
      {active ? (item.activeIcon ?? item.icon) : item.icon}
      {item.title}
    </ButtonBase>
  );
}

/** The phone's tabs, fixed to the bottom like a native app's. */
export function AppBottomNav() {
  const pathname = usePathname();
  const tabs = indexEnabled()
    ? [HOME, ASSETS, INDEXES_NAV, SAVINGS, ACTIVITY]
    : [HOME, ASSETS, SAVINGS, ACTIVITY];

  return (
    <Box
      component="nav"
      aria-label="App"
      sx={{
        display: { md: 'none' },
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        pb: 'env(safe-area-inset-bottom)',
        bgcolor: PAPER,
        borderTop: HAIRLINE,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
          height: BOTTOM_NAV_HEIGHT,
        }}
      >
        {tabs.map((item) => (
          <Tab key={item.href} item={item} pathname={pathname} />
        ))}
      </Box>
    </Box>
  );
}

'use client';

import { usePathname } from '@/routes/hooks';
import { RouterLink } from '@/routes/components';
import { INK, MUTED, PAPER } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';

import { HAIRLINE } from '@/components/_common/brand';

import { MoveMoneyMenu } from './move-money-menu';
import { APP_NAV_MAIN, isNavItemActive } from './app-nav';

import type { AppNavItem } from './app-nav';

// ----------------------------------------------------------------------

export const BOTTOM_NAV_HEIGHT = 64;

// Home, Assets, Move, Savings, Activity. Swap is one tap away inside Move.
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
        fontSize: 11,
        fontWeight: 500,
        color: active ? INK : MUTED,
        '& svg': { fontSize: 22 },
      }}
    >
      {item.icon}
      {item.title}
    </ButtonBase>
  );
}

/** The phone's tabs, fixed to the bottom like a native app's. */
export function AppBottomNav() {
  const pathname = usePathname();

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
          gridTemplateColumns: 'repeat(5, 1fr)',
          height: BOTTOM_NAV_HEIGHT,
        }}
      >
        <Tab item={HOME} pathname={pathname} />
        <Tab item={ASSETS} pathname={pathname} />
        <MoveMoneyMenu variant="tab" />
        <Tab item={SAVINGS} pathname={pathname} />
        <Tab item={ACTIVITY} pathname={pathname} />
      </Box>
    </Box>
  );
}

'use client';

import { paths } from '@/routes/paths';
import { PAPER } from '@/theme/brand-colors';

import Box from '@mui/material/Box';

import { Logo } from '@/components/template/logo';
import { HAIRLINE } from '@/components/_common/brand';

import { MoveMoneyMenu } from './move-money-menu';
import { ThemeToggleButton } from '../site/theme-toggle';
import { AccountDrawer } from '../components/account-drawer';
import { NetworkToggle, NETWORK_SWITCH_ENABLED } from '../components/network-toggle';

// ----------------------------------------------------------------------

/**
 * White, over the white page, with a hairline under it. Desktop: the light and
 * dark switch, the primary action and the account. Phones: the logo, the
 * switch, Move money as an outlined button (the bottom tabs are places only,
 * Niko 2026-11-09), and the account. The switch is the landing page's own
 * (Niko 2026-11-10), as tall as Move money beside it: 40px, 36px on phones.
 */
export function AppTopBar() {
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        bgcolor: PAPER,
        borderBottom: HAIRLINE,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          height: 64,
          px: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ display: { md: 'none' } }}>
          <Logo href={paths.portfolio} sx={{ width: 32, height: 32 }} />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {NETWORK_SWITCH_ENABLED && <NetworkToggle />}

        <ThemeToggleButton sx={{ width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 } }} />

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <MoveMoneyMenu />
        </Box>
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <MoveMoneyMenu variant="outlined" />
        </Box>

        <AccountDrawer />
      </Box>
    </Box>
  );
}

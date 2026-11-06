'use client';

import { paths } from '@/routes/paths';
import { PAPER, CANVAS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';

import { Logo } from '@/components/template/logo';
import { HAIRLINE } from '@/components/_common/brand';

import { MoveMoneyMenu } from './move-money-menu';
import { AccountDrawer } from '../components/account-drawer';
import { NetworkToggle, NETWORK_SWITCH_ENABLED } from '../components/network-toggle';

// ----------------------------------------------------------------------

/**
 * Desktop: the primary action and the account, on the page's own grey.
 * Phones: the logo and the account; Move lives in the bottom tabs.
 */
export function AppTopBar() {
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        bgcolor: { xs: PAPER, md: CANVAS },
        borderBottom: HAIRLINE,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          height: { xs: 64, md: 72 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ display: { md: 'none' } }}>
          <Logo href={paths.portfolio} sx={{ width: 32, height: 32 }} />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {NETWORK_SWITCH_ENABLED && <NetworkToggle />}

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <MoveMoneyMenu />
        </Box>

        <AccountDrawer />
      </Box>
    </Box>
  );
}

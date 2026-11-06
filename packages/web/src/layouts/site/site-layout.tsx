import type { ReactNode } from 'react';

import { INK, PAPER } from '@/theme/brand-colors';
import { FRAME_INSET_VARS } from '@/theme/site-grid';

import Box from '@mui/material/Box';

import { FrameLines } from '@/components/_common/frame-lines';
import { ReferralCapture } from '@/components/_common/referral-capture';

import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';
import { SiteThemeScope } from './theme-toggle';

// ----------------------------------------------------------------------

/** The marketing site's frame. The app has its own: layouts/app. */
export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        color: INK,
        bgcolor: PAPER,
        // The marketing site is square: buttons, tiles, menus and photos all
        // take the site radius (0). The app keeps its own corners.
        '--radius-xs': 'var(--radius-site)',
        '--radius-sm': 'var(--radius-site)',
        '--radius-md': 'var(--radius-site)',
        '--radius-lg': 'var(--radius-site)',
        // Where the frame lines stand on screens narrower than the column.
        ...FRAME_INSET_VARS,
      }}
    >
      {/* Light or dark, per the visitor; only while the site is on screen. */}
      <SiteThemeScope />
      <ReferralCapture />
      <SiteHeader />
      <Box
        component="main"
        sx={{ position: 'relative', display: 'flex', flex: '1 1 auto', flexDirection: 'column' }}
      >
        {/* The column's frame lines, continued by the header and footer. */}
        <FrameLines />
        {children}
      </Box>
      <SiteFooter />
    </Box>
  );
}

'use client';

import type { ReactNode } from 'react';

import NextLink from 'next/link';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { INK, BAND, PAPER } from '@/theme/brand-colors';

import { Box, Stack, Link as MuiLink } from '@mui/material';

const PORTFOLIO_MOCKUP = cdn('mockups/portfolio.webp');

// The frame around every sign-in step. Google and email links land on a different
// route, so that page wears this too: coming back shouldn't look like arriving
// somewhere new.
export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useTranslate();

  return (
    <Box
      sx={(theme) => ({
        // Brand ink, as on the marketing pages. The theme's text colour is a slate
        // that reads navy on a filled button.
        '--auth-ink': INK,
        '--auth-on-ink': PAPER,
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1.08fr)' },
        bgcolor: 'background.default',
      })}
    >
      <Stack sx={{ px: { xs: 2.5, sm: 5, lg: 8 }, py: { xs: 2.5, md: 3.5 }, minWidth: 0 }}>
        <Box component={NextLink} href={paths.root} sx={{ alignSelf: 'flex-start' }}>
          <Box
            component="img"
            src={cdn('logo/logo-single.svg')}
            alt="Normal"
            sx={{ height: 36, width: 'auto', display: 'block' }}
          />
        </Box>

        <Stack
          sx={{ flex: 1, justifyContent: 'center', alignItems: 'center', py: { xs: 3, md: 4 } }}
        >
          <Box sx={{ width: '100%', maxWidth: 420 }}>{children}</Box>
        </Stack>

        <Stack direction="row" spacing={2} justifyContent="center">
          <MuiLink href={paths.legal.tos} variant="caption" color="text.secondary">
            {t('Terms of Service')}
          </MuiLink>
          <MuiLink href={paths.legal.pp} variant="caption" color="text.secondary">
            {t('Privacy Policy')}
          </MuiLink>
        </Stack>
      </Stack>

      <AuthVisual />
    </Box>
  );
}

function AuthVisual() {
  const { t } = useTranslate();

  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'block' },
        position: 'sticky',
        top: 0,
        height: '100dvh',
        p: 1.5,
        pl: 0,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: '100%',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          // A dark brand panel in both modes (the band token: ink on the light
          // page, a raised near-black on the dark one); the mockup blends into it.
          bgcolor: BAND,
          isolation: 'isolate',
        }}
      >
        <Box
          component="img"
          src={PORTFOLIO_MOCKUP}
          alt={t('The Normal portfolio open on a laptop')}
          sx={{
            position: 'absolute',
            bottom: '-5%',
            left: '50%',
            width: 'min(142%, 128vh)',
            maxWidth: 'none',
            transform: 'translateX(-45.5%)',
            mixBlendMode: 'lighten',
          }}
        />
      </Box>
    </Box>
  );
}

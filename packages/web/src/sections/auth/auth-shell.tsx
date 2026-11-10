'use client';

import type { ReactNode } from 'react';

import NextLink from 'next/link';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { HeroPhone } from '@/sections/home/hero-phone';
import { INK, BAND, PAPER } from '@/theme/brand-colors';

import { Box, Stack, Link as MuiLink } from '@mui/material';

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
          // Dark behind the photo while it loads, in both modes (the band).
          bgcolor: BAND,
          isolation: 'isolate',
        }}
      >
        {/* A real person with the app on their phone, the home page's own
            photo and live Home screen (Niko 2026-11-10: not the old laptop
            mockup). The panel is portrait: the crop keeps the phone centred. */}
        <HeroPhone focus="72% 50%" />
      </Box>
    </Box>
  );
}

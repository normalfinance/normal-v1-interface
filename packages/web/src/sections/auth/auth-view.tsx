'use client';

import NextLink from 'next/link';
import { Suspense } from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import { Box, Stack, Typography, Link as MuiLink } from '@mui/material';

import { AuthForm } from './auth-form';

const PORTFOLIO_MOCKUP = cdn('mockups/portfolio.webp');

export function AuthView() {
  const { t } = useTranslate();

  return (
    <Box
      sx={(theme) => ({
        // Brand ink, as on the marketing pages. The theme's text colour is a slate
        // that reads navy on a filled button.
        '--auth-ink': '#0A0A0F',
        '--auth-on-ink': '#fff',
        ...theme.applyStyles('dark', {
          '--auth-ink': theme.vars.palette.text.primary,
          '--auth-on-ink': theme.vars.palette.background.paper,
        }),
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
          <Box sx={{ width: '100%', maxWidth: 420 }}>
            {/* Reads the URL's `next`, so it renders in the browser. The logo and
                image around it are in the first paint. */}
            <Suspense fallback={null}>
              <AuthForm />
            </Suspense>
          </Box>
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
          bgcolor: '#0A0A0F',
          isolation: 'isolate',
        }}
      >
        {/* Brand-coloured light behind the laptop. The photo's black backdrop
            blends into it through `lighten`, so there's no visible image edge. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(52% 38% at 38% 66%, rgba(110,139,255,0.30), transparent 72%), radial-gradient(44% 34% at 70% 62%, rgba(255,123,197,0.20), transparent 72%)',
          }}
        />
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

        <Box sx={{ position: 'relative', p: { md: 5, lg: 6 }, maxWidth: 560 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.56)',
              mb: 1.5,
            }}
          >
            {t('Your portfolio')}
          </Typography>
          <Typography
            component="p"
            sx={{
              fontSize: { md: 34, lg: 44 },
              lineHeight: 1.08,
              fontWeight: 500,
              letterSpacing: '-0.03em',
              color: '#fff',
              mb: 2,
              textWrap: 'balance',
            }}
          >
            {t('Track everything in one place')}
          </Typography>
          <Typography sx={{ fontSize: 16, lineHeight: 1.5, color: 'rgba(255,255,255,0.64)' }}>
            {t('Wallet balance, savings position, and lifetime earnings — all in one view.')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

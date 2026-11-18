'use client';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { INK, PAPER } from '@/theme/brand-colors';
import { FRAME_INSET_VARS } from '@/theme/site-grid';

import Box from '@mui/material/Box';

import { Logo } from '@/components/template/logo';
import { PageHero } from '@/components/_common/page-hero';
import { FrameLines } from '@/components/_common/frame-lines';
import { HAIRLINE, COLUMN_SX, GUTTER_SX, BrandButton } from '@/components/_common/brand';

// ----------------------------------------------------------------------

/**
 * The 500. An error boundary shows it in place of the page, outside the site
 * frame, so it brings its own: the square corners and the frame lines of the
 * marketing site, and a bar with the mark that leads home. Nothing else it
 * shows can fail: no session, no data.
 */
export function View500() {
  const { t } = useTranslate();

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        color: INK,
        bgcolor: PAPER,
        // As in layouts/site: the marketing site is square.
        '--radius-xs': 'var(--radius-site)',
        '--radius-sm': 'var(--radius-site)',
        '--radius-md': 'var(--radius-site)',
        '--radius-lg': 'var(--radius-site)',
        ...FRAME_INSET_VARS,
      }}
    >
      <FrameLines />
      <Box component="header" sx={{ borderBottom: HAIRLINE }}>
        <Box
          sx={{
            ...COLUMN_SX,
            ...GUTTER_SX,
            display: 'flex',
            alignItems: 'center',
            height: { xs: 64, md: 72 },
          }}
        >
          <Logo sx={{ width: 32, height: 32 }} />
        </Box>
      </Box>
      <Box component="main" sx={{ flex: '1 1 auto' }}>
        <PageHero
          compact
          id="error-title"
          eyebrow={t('Error 500')}
          title={t('Something went wrong on our side.')}
          lede={t('Please try again in a few minutes. If it keeps happening, let us know.')}
          actions={
            <>
              <BrandButton href={paths.root}>{t('Go to home')}</BrandButton>
              <BrandButton emphasis="secondary" href={paths.core.contact}>
                {t('Contact us')}
              </BrandButton>
            </>
          }
        />
      </Box>
    </Box>
  );
}

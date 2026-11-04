'use client';

import * as React from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import { useTheme } from '@mui/material/styles';
import { Box, Stack, Typography } from '@mui/material';

import {
  HAIRLINE,
  HeroLede,
  HeroBadge,
  HeroTitle,
  BrandButton,
  GradientText,
} from '@/components/_common/brand';

import { WavyBackground } from './wavy-background';
import { HeroPortfolioCard } from '../hero-portfolio-card';

// ----------------------------------------------------------------------

export const HeroHeader: React.FC = () => {
  const { t } = useTranslate();
  const theme = useTheme();

  const trustItems = [
    {
      label: t('Audited by'),
      src: cdn('homepage/halborn-logo.webp'),
      alt: 'Halborn',
      width: 72,
      height: 8,
    },
    {
      label: t('Backed by'),
      src: cdn('homepage/draper-university.webp'),
      alt: 'Draper University',
      width: 56,
      height: 18,
    },
    {
      label: t('Backed by'),
      src: cdn('homepage/stellar-logo.webp'),
      alt: 'Stellar',
      width: 52,
      height: 13,
    },
  ];

  return (
    <Box
      component="section"
      sx={(th) => ({
        position: 'relative',
        overflow: 'hidden',
        pt: 7,
        pb: { xs: 7, md: 9, lg: 11 },
        bgcolor: 'background.default',
        ...th.applyStyles('dark', { bgcolor: 'background.paper' }),
      })}
    >
      {/* Wavy canvas */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <WavyBackground
          sizing="viewport"
          baseline="center"
          yOffset={200}
          colors={['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#22d3ee']}
          waveOpacity={0.35}
          blur={36}
          saturate={115}
          canvasOpacity={0.85}
          speed="slow"
          backgroundFill={
            theme.palette.mode === 'dark' ? theme.palette.background.paper : '#FAFAFB'
          }
        />
      </Box>

      {/* Fade top */}
      <Box
        sx={(th) => ({
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '90px',
          background:
            th.palette.mode === 'dark'
              ? `linear-gradient(to bottom, ${th.palette.background.paper} 0%, transparent 100%)`
              : 'linear-gradient(to bottom, rgba(250,250,251,1) 0%, rgba(250,250,251,0) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        })}
      />

      {/* Fade bottom */}
      <Box
        sx={(th) => ({
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '140px',
          background:
            th.palette.mode === 'dark'
              ? `linear-gradient(to top, ${th.palette.background.paper} 0%, transparent 100%)`
              : 'linear-gradient(to top, rgba(250,250,251,1) 0%, rgba(250,250,251,0) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        })}
      />

      {/* Content: text on the left, the portfolio block on the right */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          mx: 'auto',
          maxWidth: 'var(--page-max)',
          px: { xs: 2, sm: 3 },
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 440px)' },
          gap: { xs: 6, md: 8 },
          alignItems: 'start',
        }}
      >
        {/* Top-aligned: centring against the tall block pushes the text and the
            trust row below the fold on a 13" laptop. */}
        <Box sx={{ pt: { md: 5 } }}>
          <HeroBadge>
            {t('Investing that works for you')}
            <Box sx={{ width: '1px', height: 12, flexShrink: 0, bgcolor: 'rgba(10,10,15,0.12)' }} />
            <Box
              component="img"
              src={cdn('homepage/normal-long.svg')}
              alt="Normal"
              sx={{ width: 64, height: 14, objectFit: 'contain' }}
            />
          </HeroBadge>

          <HeroTitle>
            {t('Buy crypto.')} <Box component="br" sx={{ display: { sm: 'none' } }} />
            {t('Earn yield.')}
            <br />
            <GradientText>{t('All in one place.')}</GradientText>
          </HeroTitle>

          <HeroLede>{t('Self-custody savings. Live yield. Built on Stellar.')}</HeroLede>

          <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mt: 4 }}>
            <BrandButton href={paths.savings}>{t('Start saving →')}</BrandButton>
            <BrandButton
              emphasis="secondary"
              href="https://normalfi.substack.com/p/making-crypto-normal-simple-safe"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('Read whitepaper')}
            </BrandButton>
          </Stack>

          {/* ---- Trust row ---- */}
          <Stack direction="row" flexWrap="wrap" sx={{ mt: 5, rowGap: 2 }}>
            {trustItems.map((item, i) => (
              <Stack
                key={item.alt}
                spacing="6px"
                sx={{
                  pr: { xs: 2, sm: 3 },
                  ...(i > 0 && { pl: { xs: 2, sm: 3 }, borderLeft: HAIRLINE }),
                }}
              >
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'text.disabled',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}
                >
                  {item.label}
                </Typography>
                <Box
                  component="img"
                  src={item.src}
                  alt={item.alt}
                  sx={{
                    width: item.width,
                    height: item.height,
                    objectFit: 'contain',
                    objectPosition: 'left',
                    filter:
                      theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)',
                    opacity: 0.55,
                  }}
                />
              </Stack>
            ))}
          </Stack>
        </Box>

        <Box sx={{ width: '100%', justifySelf: { md: 'end' } }}>
          <HeroPortfolioCard />
        </Box>
      </Box>
    </Box>
  );
};

HeroHeader.displayName = 'HeroHeader';

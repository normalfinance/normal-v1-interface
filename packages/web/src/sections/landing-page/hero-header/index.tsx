'use client';

import * as React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Chip, Paper, Stack, Container, Typography } from '@mui/material';

import SavingsCard from '@/components/_common/savings-card';

import { WavyBackground } from './wavy-background';

type ImageProps = {
  src: string;
  alt?: string;
};

type Props = {
  heading: string;
  description: string;
  image: ImageProps;
  halbornImage: ImageProps;
  tagline: string;
  taglineLogo: ImageProps;
};

type HeroHeaderProps = Partial<Props>;

export const HeroHeader: React.FC<HeroHeaderProps> = (incomingProps) => {
  const { heading, description, image, halbornImage, tagline, taglineLogo, ...sectionProps } = {
    ...HeroHeaderDefaults,
    ...incomingProps,
  } as Props;

  const { t } = useTranslate();
  const theme = useTheme();

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: '5%',
        py: { xs: 6, md: 8, lg: 10 },
        bgcolor: 'background.paper',
      }}
      {...sectionProps}
    >
      {/* ------------ BACKGROUND LAYER ------------ */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <WavyBackground
          sizing="viewport"
          baseline="center"
          yOffset={0}
          colors={['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#22d3ee']}
          waveOpacity={0.35}
          speed="slow"
          backgroundFill={theme.palette.background.paper}
        />
      </Box>

      {/* ------------ FOREGROUND CONTENT ------------ */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, px: 0 }}>
        <Stack spacing={{ xs: 6, md: 10 }} alignItems="center">
          <Box textAlign="center" maxWidth={750}>
            <Paper
              variant="outlined"
              sx={{
                justifyContent: 'center',
                backgroundColor: alpha(theme.palette.grey[500], 0.12),
                px: '10px',
                py: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '9999px',
                mb: 2,
              }}
            >
              <Stack
                direction="row"
                spacing="6px"
                sx={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 500, fontSize: 14 }}
                >
                  {t(tagline)}
                </Typography>
                <Box
                  sx={{
                    width: '2px',
                    height: '10px',
                    backgroundColor: alpha(theme.palette.grey[500], 0.12),
                  }}
                />
                <Box
                  component="img"
                  src={taglineLogo.src}
                  alt={taglineLogo.alt ?? ''}
                  sx={{ width: '64px', height: '14px', objectFit: 'cover' }}
                />
              </Stack>
            </Paper>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                fontWeight: 500,
                mb: { xs: 3, md: 4 },
                fontSize: {
                  xs: '2.5rem',
                  md: '3.75rem',
                  lg: '4rem',
                },
              }}
            >
              {t('Earn passive yield, and ')}{' '}
              <Box
                component="span"
                sx={{
                  fontStyle: 'italic',
                  background: 'linear-gradient(90deg, #2bd2ff 0%, #b561ff 40%, #ff5cb1 70%, #ffb347 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t('watch it grow')}
              </Box>
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                display: 'inline-flex',
                alignItems: 'flex-start',
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                borderRadius: '9999px',
                px: 3,
                py: 1.5,
                gap: 0,
              }}
            >
              {[
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
              ].map((item, i, arr) => (
                <React.Fragment key={i}>
                  <Stack alignItems="center" spacing="5px" sx={{ px: 2.5 }}>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
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
                        filter: theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)',
                        opacity: 0.5,
                      }}
                    />
                  </Stack>
                  {i < arr.length - 1 && (
                    <Box sx={{ width: '1px', height: 32, backgroundColor: alpha(theme.palette.grey[500], 0.24), flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
            </Paper>

            <Box
              sx={{
                maxWidth: 480,
                width: '100%',
                mx: 'auto',
                my: { xs: 4, md: 5 },
              }}
            >
              <SavingsCard />
            </Box>

            <Typography
              component="div"
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 340, mx: 'auto', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}
            >
              {t('A universal investing app - Trade and diversify any global asset in just one click.')}
              <Chip
                label={t('Coming soon')}
                size="small"
                color="info"
                sx={{ fontWeight: 500 }}
              />
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

/* ---------- defaults ---------- */

export const HeroHeaderDefaults: Props = {
  heading: 'Medium length hero heading goes here',
  description: 'Your dollars deserve better. Earn competitive yield within clicks.',
  image: {
    src: cdn('homepage/stellar-logo.webp'),
    alt: 'Stellar Logo Long',
  },
  halbornImage: {
    src: cdn('homepage/halborn-logo.webp'),
    alt: 'Stellar Logo Long',
  },
  tagline: 'Investing that works for you',
  taglineLogo: {
    src: cdn('homepage/normal-long.svg'),
    alt: 'Normal Logo Long',
  },
};

HeroHeader.displayName = 'HeroHeader';

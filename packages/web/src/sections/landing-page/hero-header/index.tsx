'use client';

import type { SwapFeeInfo } from '@/types/swap-fee-info';
import type { SwapQueryParams } from '@/types/query-params';

import * as React from 'react';
import { useEffect } from 'react';
import { useTranslate } from '@/locales';
import { useAppStore } from '@normalfinance/state';
import { logger } from '@normalfinance/utils';

import { Box, Paper, Stack, Container, Typography } from '@mui/material';

import SwapCard from '@/components/_common/swap-card';

import { WavyBackground } from './wavy-background';

type ImageProps = {
  src: string;
  alt?: string;
};

type Props = {
  heading: string;
  description: string;
  image: ImageProps;
  tagline: string;
  taglineLogo: ImageProps;
  swapParams?: SwapQueryParams;
};

type HeroHeaderProps = Partial<Props>;

const swapFeeInfo: SwapFeeInfo = {
  feePercentage: 0.25,
  networkCost: 1.0,
  priceImpact: -0.3,
  maxSlippage: 0.5,
};

export const HeroHeader: React.FC<HeroHeaderProps> = (incomingProps) => {
  const { heading, description, image, tagline, taglineLogo, swapParams, ...sectionProps } = {
    ...HeroHeaderDefaults,
    ...incomingProps,
  } as Props;

  const { t } = useTranslate();

  const { tokens, getAllTokens, setGlobalIsLoading } = useAppStore();

  useEffect(() => {
    if (tokens.length === 0) {
      setGlobalIsLoading(true);

      getAllTokens()
        .catch((error) => logger.error(error))
        .finally(() => {
          setGlobalIsLoading(false);
        });
    }
  }, []);

  const allowedTokens = React.useMemo(
    () =>
      tokens.filter(
        (token) => token.symbol === 'XLM' || token.symbol?.toLowerCase().startsWith('n')
      ),
    [tokens]
  );

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: '5%',
        py: { xs: 6, md: 8, lg: 10 },
        backgroundColor: 'white',
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
        {/* animated waves */}
        <WavyBackground
          sizing="viewport"
          baseline="center" // or "top"
          yOffset={0}
          colors={['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#22d3ee']}
          waveOpacity={0.35}
          speed="slow"
          backgroundFill="white"
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
                backgroundColor: 'rgba(145, 158, 171, 0.12)',
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
                    backgroundColor: 'rgba(145, 158, 171, 0.12)',
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
              {t('Instant crypto swaps, finally made')}{' '}
              <Box
                component="span"
                sx={{
                  background: `linear-gradient(
                                90deg,
                                #2DE9C8 0%,
                                #00AFF7 20%,
                                #947BFF 40%,
                                #F8279C 60%,
                                #FF6F4C 80%,
                                #FFE13D 100%
                              )`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t('Normal')}
              </Box>
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                columnGap: '10px',
                rowGap: '10px',
                fontSize: 14,
                fontWeight: 600,
                mx: 'auto',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <span>💸 {t('Low fees')}</span>
              <span>•</span>
              <span>🌍 {t('Global access')}</span>
              <span>•</span>
              <span>⚡ {t('Built on Stellar')}</span>
            </Typography>

            <Box
              sx={{
                maxWidth: 480,
                width: '100%',
                mx: 'auto',
                my: { xs: 4, md: 5 },
                p: 1,
                borderRadius: 3,
                backgroundColor: 'white',
                boxShadow: '0px 9px 50px 0px rgba(0,0,0,0.25)',
              }}
            >
              <SwapCard
                tokensList={allowedTokens}
                swapFeeInfo={swapFeeInfo}
                queryParams={swapParams}
              />
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 340, mx: 'auto' }}>
              {t(description)}
            </Typography>
            <Box
              component="img"
              src={image.src}
              alt={image.alt ?? ''}
              sx={{ width: '82px', height: 'auto', objectFit: 'cover', mt: '20px' }}
            />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

/* ---------- defaults ---------- */

export const HeroHeaderDefaults: Props = {
  heading: 'Medium length hero heading goes here',
  description:
    'The largest on-chain catalogue of synthetic crypto and real-world assets built on Stellar.',
  image: {
    src: '/assets/images/landing-page/stellar-logo.webp',
    alt: 'Stellar Logo Long',
  },
  tagline: 'Crypto that just works',
  taglineLogo: {
    src: '/assets/images/landing-page/normal-long.svg',
    alt: 'Normal Logo Long',
  },
};

HeroHeader.displayName = 'HeroHeader';

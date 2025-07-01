'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  type ButtonProps as MuiButtonProps,
} from '@mui/material';
import SwapCard from '@/components/_common/swap-card';
import { WavyBackground } from './wavy-background';
import { Token } from '@/types/token';
import { SwapFeeInfo } from '@/types/swap-fee-info';
import { alpha, useTheme } from '@mui/material/styles';
import { wrap } from 'module';

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
};

export type HeroHeaderProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

const tokensList: Token[] = [
  {
    id: 1,
    url: 'https://token-icons.s3.amazonaws.com/eth.png',
    name: 'Ethereum',
    shortname: 'ETH',
    owned: true,
    countstatus: 0.02106,
    pricestatus: 2814.25,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 2,
    url: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
    name: 'USDC',
    shortname: 'USDC',
    owned: false,
    countstatus: 0,
    pricestatus: 0.9998,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 3,
    url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    name: 'Tether',
    shortname: 'USDT',
    owned: false,
    countstatus: 0,
    pricestatus: 0.9999,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },

  {
    id: 4,
    url: 'https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png?1696507857',
    name: 'Wrapped Bitcoin',
    shortname: 'WBTC',
    owned: false,
    countstatus: 0,
    pricestatus: 95799.17,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 5,
    url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    name: 'Wrapped Ether',
    shortname: 'WETH',
    owned: false,
    countstatus: 0,
    pricestatus: 2806.75,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 6,
    url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    name: 'Wrapped Ether',
    shortname: 'WETH',
    owned: false,
    countstatus: 0,
    pricestatus: 2806.75,
    featured: false,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
];

const swapFeeInfo: SwapFeeInfo = {
  feePercentage: 0.25,
  networkCost: 1.0,
  priceImpact: -0.3,
  maxSlippage: 0.5,
};

export const HeroHeader: React.FC<HeroHeaderProps> = (incomingProps) => {
  const { heading, description, image, tagline, taglineLogo, ...sectionProps } = {
    ...HeroHeaderDefaults,
    ...incomingProps,
  } as Props;

  const theme = useTheme();

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
          containerClassName="w-full h-full"
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
                  {tagline}
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
              Instant crypto swaps, finally made{' '}
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(90deg, #947BFF 79.77%, #F8279C 92.22%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text', // for Firefox
                  color: 'transparent',
                }}
              >
                Normal
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
              <span>💸 Low fees</span>
              <span>•</span>
              <span>🌍 Global access</span>
              <span>•</span>
              <span>⚡ Built on Stellar</span>
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
              <SwapCard tokensList={tokensList} swapFeeInfo={swapFeeInfo} />
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 340, mx: 'auto' }}>
              {description}
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
  description: 'Largest onchain marketspace built on Stellar. Buy and sell crypto on Stellar.',
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

'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  type ButtonProps as MuiButtonProps,
} from '@mui/material';
import SwapCard from '@/components/_common/swap-card';
import { WavyBackground } from './wavy-background';
import { Token } from '@/types/token';
import { SwapFeeInfo } from '@/types/swap-fee-info';
type ImageProps = {
  src: string;
  alt?: string;
};

type ButtonConfig = MuiButtonProps & { title: string };

type Props = {
  heading: string;
  description: string;
  buttons: ButtonConfig[];
  image: ImageProps;
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
  const { heading, description, buttons, image, ...sectionProps } = {
    ...HeroHeaderDefaults,
    ...incomingProps,
  } as Props;

  return (
    <Box
      component="section"
      id="relume"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: '5%',
        py: { xs: 8, md: 12, lg: 14 },
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
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={{ xs: 6, md: 10 }} alignItems="center">
          <Box textAlign="center" maxWidth={750}>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                fontWeight: 500,
                mb: { xs: 3, md: 4 },
                fontSize: {
                  xs: '2rem',
                  md: '2.75rem',
                  lg: '3rem',
                },
              }}
            >
              Instant crypto swaps, finally made Normal
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

            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              {description}
            </Typography>

            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              sx={{ mt: { xs: 4, md: 5 } }}
            >
              {buttons.map((btn, idx) => (
                <Button key={idx} {...btn}>
                  {btn.title}
                </Button>
              ))}
            </Stack>
          </Box>

          <Box
            component="img"
            src={image.src}
            alt={image.alt ?? ''}
            sx={{ width: '100%', height: 'auto', objectFit: 'cover' }}
          />
        </Stack>
      </Container>
    </Box>
  );
};

/* ---------- defaults ---------- */

export const HeroHeaderDefaults: Props = {
  heading: 'Medium length hero heading goes here',
  description:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.',
  buttons: [
    { title: 'Button', variant: 'contained' },
    { title: 'Button', variant: 'outlined', color: 'secondary' },
  ],
  image: {
    src: 'https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg',
    alt: 'Relume placeholder image',
  },
};

HeroHeader.displayName = 'HeroHeader';

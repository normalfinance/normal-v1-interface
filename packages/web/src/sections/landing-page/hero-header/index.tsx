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
        position: 'relative', // ⬅︎ so the bg can sit behind
        overflow: 'hidden', // no stray waves outside the hero
        px: '5%',
        py: { xs: 8, md: 12, lg: 14 },
      }}
      {...sectionProps}
    >
      {/* ----- animated background layer ----- */}
      <WavyBackground
        // make the wrapper fill the section and sit behind content
        containerClassName="absolute inset-0 -z-10 pointer-events-none"
        className="w-full h-full"
        // optional tweaks
        colors={['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#22d3ee']}
        waveWidth={60}
        blur={20}
        speed="slow"
        waveOpacity={0.4}
        backgroundFill="transparent"
      />

      {/* ----- foreground content ----- */}
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 6, md: 10 }} alignItems="center">
          <Box textAlign="center" maxWidth={750}>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                fontWeight: 500,
                mb: { xs: 3, md: 4 },
                fontSize: {
                  xs: '2rem', // 32 px
                  md: '2.75rem', // 44 px
                  lg: '3rem', // 48 px
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
              }}
            >
              <SwapCard />
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

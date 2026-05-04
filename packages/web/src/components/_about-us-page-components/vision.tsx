'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import Grid2 from '@mui/material/Grid2';
import { Box, Paper, Stack, Container, Typography, CardContent } from '@mui/material';

import WorldMap from '../ui/world-map';
import EarnAnimation from '../ui/earn-animation';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type Img = { src: string; alt?: string };

type TopCard = {
  title: string;
  description: string;
};

type BottomCard = {
  icon: Img;
  title: string;
  description: string;
};

type Props = {
  heading: string;
  topCards: [TopCard, TopCard];
  bottomCards: [BottomCard, BottomCard, BottomCard];
};

export type VisionProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

/* -------------------------------------------------------------------------- */
/*                                 Defaults                                   */
/* -------------------------------------------------------------------------- */

export const VisionDefaults: Props = {
  heading: 'Our Vision',
  topCards: [
    {
      title: 'Deposit. Earn. Compound.',
      description:
        'Your USDC goes into audited lending pools on Stellar. Borrowers pay interest to access liquidity — you collect it. Yield compounds daily and you can withdraw anytime.',
    },
    {
      title: 'Borderless Access',
      description:
        "Your zip code shouldn't determine your returns. Normal gives everyone access to yields that used to require the right bank, the right broker, or the right country.",
    },
  ],
  bottomCards: [
    {
      icon: { src: cdn('about-page/n1.svg'), alt: 'Deposits' },
      title: 'Instant Deposits',
      description:
        'Cash hits your account in seconds. No hold times, no business-day delays — just your money, moving when you need it to.',
    },
    {
      icon: { src: cdn('about-page/n2.svg'), alt: 'Transparent' },
      title: 'Transparent by Default',
      description:
        'Normal never takes custody of your funds. Your USDC is secured by Stellar\'s blockchain — the same infrastructure trusted by financial institutions and payment networks worldwide. Every rate and every transaction is public. Check it anytime.',
    },
    {
      icon: { src: cdn('about-page/n3.svg'), alt: 'Growth' },
      title: 'The Start of Something Bigger',
      description:
        'USDC savings is the foundation. Crypto, equities, and real assets are coming — all in one place, all yours to control.',
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const paperSx = {
  bgcolor: 'background.neutral',
  borderRadius: 3,
};

const topCardPadding = { xs: 3, md: 4 };
const bottomCardPadding = { xs: 2.5, md: 3.5 };

/* -------------------------------------------------------------------------- */
/*                              Helper Components                              */
/* -------------------------------------------------------------------------- */

const TopFeatureCard: React.FC<TopCard & { map?: boolean }> = ({
  title,
  description,
  map = false,
}) => (
  <Paper variant="outlined" sx={{ ...paperSx, height: '100%' }}>
    <Stack p={topCardPadding} height="100%">
      <Box
        sx={{
          width: '100%',
          height: { xs: 'auto', md: 320 },
          borderRadius: 2,
          mb: 4,
        }}
      >
        {map ? (
          <WorldMap
            backgroundSrc={cdn('about-page/world-map.webp')}
            dots={[
              {
                start: {
                  lat: 64.2008,
                  lng: -149.4937,
                }, // Alaska (Fairbanks)
                end: {
                  lat: 34.0522,
                  lng: -118.2437,
                }, // Los Angeles
              },
              {
                start: { lat: 64.2008, lng: -149.4937 }, // Alaska (Fairbanks)
                end: { lat: -15.7975, lng: -47.8919 }, // Brazil (Brasília)
              },
              {
                start: { lat: -15.7975, lng: -47.8919 }, // Brazil (Brasília)
                end: { lat: 38.7223, lng: -9.1393 }, // Lisbon
              },
              {
                start: { lat: 51.5074, lng: -0.1278 }, // London
                end: { lat: 28.6139, lng: 77.209 }, // New Delhi
              },
              {
                start: { lat: 28.6139, lng: 77.209 }, // New Delhi
                end: { lat: 43.1332, lng: 131.9113 }, // Vladivostok
              },
              {
                start: { lat: 28.6139, lng: 77.209 }, // New Delhi
                end: { lat: -1.2921, lng: 36.8219 }, // Nairobi
              },
            ]}
          />
        ) : (
          <EarnAnimation />
        )}
      </Box>
      <Typography variant="subtitle1" fontWeight={700} mb={1}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Stack>
  </Paper>
);

const BottomStatCard: React.FC<BottomCard> = ({ icon, title, description }) => (
  <Paper variant="outlined" sx={{ ...paperSx, height: '100%' }}>
    <CardContent sx={{ p: bottomCardPadding }}>
      <Box mb={2.5}>
        <Box component="img" src={icon.src} alt={icon.alt} sx={{ width: 44, height: 44 }} />
      </Box>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </CardContent>
  </Paper>
);

/* -------------------------------------------------------------------------- */
/*                               Main Component                                */
/* -------------------------------------------------------------------------- */

export const Vision: React.FC<VisionProps> = (props) => {
  const { t } = useTranslate();

  const { heading, topCards, bottomCards, ...sectionProps } = {
    ...VisionDefaults,
    ...props,
  };

  return (
    <Box component="section" {...sectionProps} py={{ xs: 8, md: 12, lg: 14 }} id="our-vision" bgcolor="#FAFAFA" sx={(theme) => ({ borderBottom: `1px solid ${theme.palette.divider}` })}>
      <Container>
        <Box maxWidth={720} textAlign="left" mb={{ xs: 4, md: 6 }}>
          <Typography
            component="h2"
            sx={{
              fontWeight: 500,
              fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' },
              lineHeight: 1.15,
            }}
          >
            {t(heading)}
          </Typography>
        </Box>

        {/* Top row: two small feature cards */}
        <Grid2 container spacing={{ xs: 2, md: 2, lg: 2 }} mb={{ xs: 2, md: 2 }}>
          <Grid2 size={{ xs: 12, lg: 6 }}>
            <TopFeatureCard {...topCards[0]} />
          </Grid2>
          <Grid2 size={{ xs: 12, lg: 6 }}>
            <TopFeatureCard {...topCards[1]} map />
          </Grid2>
        </Grid2>

        {/* Bottom row: three stat cards */}
        <Grid2 container spacing={{ xs: 2, md: 2, lg: 2 }}>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <BottomStatCard {...bottomCards[0]} />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <BottomStatCard {...bottomCards[1]} />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <BottomStatCard {...bottomCards[2]} />
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  );
};

export default Vision;

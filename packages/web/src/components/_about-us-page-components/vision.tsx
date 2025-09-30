'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import Grid2 from '@mui/material/Grid2';
import { Box, Paper, Container, Typography, CardContent, Stack } from '@mui/material';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type Img = { src: string; alt?: string };

type TopCard = {
  image: Img;
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
      image: {
        src: '/assets/images/about/diversify.webp',
        alt: '1-Click diversification',
      },
      title: '1-Click diversification',
      description:
        'Build a balanced portfolio instantly with custom crypto baskets in a single tap.',
    },
    {
      image: { src: '/assets/images/about/world-map.webp', alt: 'Borderless Access' },
      title: 'Borderless Access',
      description:
        'Trade and invest globally without barriers. Wherever you are, Normal connects you to opportunities.',
    },
  ],
  bottomCards: [
    {
      icon: { src: '/assets/images/about/n1.svg', alt: 'Swaps' },
      title: 'Sub-Second Swaps & Deep Liquidity',
      description: 'Execute trades instantly with optimized routing and deep liquidity pools.',
    },
    {
      icon: { src: '/assets/images/about/n2.svg', alt: 'Governance' },
      title: '100 % Community Governance',
      description:
        'Every decision is driven by the community — powered by open participation and voting.',
    },
    {
      icon: { src: '/assets/images/about/n3.svg', alt: 'Growth' },
      title: 'Sustainable Growth',
      description: 'Normal grows with the community — expanding responsibly, together.',
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const paperSx = {
  bgcolor: '#F9FAFB',
  borderRadius: 3,
};

const topCardPadding = { xs: 3, md: 4 };
const bottomCardPadding = { xs: 2.5, md: 3.5 };

/* -------------------------------------------------------------------------- */
/*                              Helper Components                              */
/* -------------------------------------------------------------------------- */

const TopFeatureCard: React.FC<TopCard> = ({ image, title, description }) => (
  <Paper variant="outlined" sx={{ ...paperSx, height: '100%' }}>
    <Stack p={topCardPadding} height="100%">
      <Box
        component="img"
        src={image.src}
        alt={image.alt}
        sx={{
          width: '100%',
          height: { xs: 200, md: 260 },
          objectFit: 'contain',
          borderRadius: 2,
        }}
        mb={4}
      />
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
    <Box component="section" {...sectionProps} py={{ xs: 8, md: 12, lg: 14 }} id="our-vision">
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
            <TopFeatureCard {...topCards[1]} />
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

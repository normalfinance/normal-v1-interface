'use client';

import React from 'react';

import Grid2 from '@mui/material/Grid2';
import { Box, Paper, Container, Typography, CardContent } from '@mui/material';

/* -------------------------------------------------------------------------- */
/*                                 Prop Types                                 */
/* -------------------------------------------------------------------------- */

type ImageProps = {
  src: string;
  alt?: string;
};

type StatCardProps = {
  icon: {
    src: string;
    alt: string;
  };
  description: string;
};

type Props = {
  heading: string;
  description: string;
  image: ImageProps;
  stats: StatCardProps[];
};

export type VisionProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

/* -------------------------------------------------------------------------- */
/*                                Defaults                                    */
/* -------------------------------------------------------------------------- */

export const VisionDefaults: Props = {
  heading: 'Our Vision',
  description:
    'We see a future where self‑custody and sophisticated portfolio strategies live together. By 2030, we aim to:',
  image: {
    src: '/assets/images/about/team2.webp',
    alt: 'Team image 2',
  },
  stats: [
    {
      icon: {
        src: '/assets/images/about/i6.svg',
        alt: 'Icon 1',
      },
      description:
        '1‑Click diversification in any chain‑agnostic wallet—gas‑abstracted mint & redeem.',
    },
    {
      icon: {
        src: '/assets/images/about/i7.svg',
        alt: 'Icon 2',
      },
      description:
        'Sub‑second swaps & deep liquidity across all Normal indexes and wrapped assets.',
    },
    {
      icon: {
        src: '/assets/images/about/i8.svg',
        alt: 'Icon 3',
      },
      description:
        '100 % community governance on upgrades, fees, and new product launches through NORM votes.',
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*                              Vision Component                              */
/* -------------------------------------------------------------------------- */

export const Vision: React.FC<VisionProps> = (props) => {
  const { heading, description, image, stats, ...sectionProps } = {
    ...VisionDefaults,
    ...props,
  };

  return (
    <Box component="section" {...sectionProps} py={{ xs: 8, md: 12, lg: 14 }}>
      <Container>
        <Box maxWidth={600} mx="left" textAlign="left" mb={{ xs: 6, md: 9, lg: 10 }}>
          <Typography
            component="h2"
            sx={{
              fontWeight: 500,
              fontSize: {
                xs: '2rem',
                md: '3rem',
                lg: '3rem',
              },
              mb: { xs: 2, md: 3 },
            }}
          >
            {heading}
          </Typography>
          <Typography variant="body1">{description}</Typography>
        </Box>

        <Grid2 container spacing={{ xs: 4, lg: 6 }} columns={{ xs: 1, lg: 12 }}>
          <Grid2
            size={{ xs: 12, lg: 5 }}
            display="flex"
            flexDirection={{ xs: 'column', md: 'row', lg: 'column' }}
            gap={3}
          >
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </Grid2>

          <Grid2
            size={{ xs: 12, lg: 7 }}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Box
              component="img"
              src={image.src}
              alt={image.alt}
              sx={{
                width: '100%',
                objectFit: 'cover',
                borderRadius: 3,
                border: 5,
                borderStyle: 'solid',
                borderColor: 'divider',
                aspectRatio: '1/1',
              }}
            />
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  );
};

/* -------------------------------------------------------------------------- */
/*                                StatCard                                    */
/* -------------------------------------------------------------------------- */

const paperSx = {
  bgcolor: '#F9FAFB',
  borderRadius: 3,
};

const cardPadding = { xs: 2.5, md: 4 };

const StatCard: React.FC<StatCardProps> = ({ icon, description }) => (
  <Paper variant="outlined" sx={{ ...paperSx }}>
    <CardContent sx={{ p: cardPadding }}>
      <Box mb={5}>
        <Box
          sx={{
            backgroundColor: 'background.paper',
            width: 64,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: 1,
            borderColor: 'divider',
            zIndex: 10,
          }}
        >
          <Box component="img" src={icon.src} alt={icon.alt} sx={{ width: 32, height: 32 }} />
        </Box>
      </Box>
      <Typography variant="body2">{description}</Typography>
    </CardContent>
  </Paper>
);

export default Vision;

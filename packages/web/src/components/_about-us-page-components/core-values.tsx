'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import Grid2 from '@mui/material/Grid2';
import { Box, Paper, Stack, Container, Typography } from '@mui/material';

/* --------------------------------- Types --------------------------------- */

type FeatureItem = {
  icon: {
    src: string;
    alt: string;
    bg?: string; // optional background color for icon container
  };
  heading: string;
  description: string;
};

type Props = {
  heading: string;
  features: FeatureItem[]; // expect 5 items
};

export type CoreValuesProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

/* ------------------------------- Defaults -------------------------------- */

export const CoreValuesDefaults: Props = {
  heading: 'Core Values',
  features: [
    {
      icon: { src: cdn('about-page/i1.svg'), alt: 'Icon 1' },
      heading: 'Keep Crypto Human',
      description: 'Remove complexity, speak plainly, design for real people.',
    },
    {
      icon: { src: cdn('about-page/i2.svg'), alt: 'Icon 2' },
      heading: 'Security First',
      description: 'Audited contracts, battle-tested code, and 24/7 monitoring.',
    },
    {
      icon: { src: cdn('about-page/i3.svg'), alt: 'Icon 3' },
      heading: 'Permissionless Innovation',
      description: 'Build composable primitives that anyone can extend.',
    },
    {
      icon: { src: cdn('about-page/i4.svg'), alt: 'Icon 4' },
      heading: 'Community Ownership',
      description: 'NORM token holders create and vote on proposals.',
    },
    {
      icon: { src: cdn('about-page/i5.svg'), alt: 'Icon 5' },
      heading: 'Data > Hype',
      description: 'Let on-chain metrics guide every product decision.',
    },
  ],
};

/* --------------------------------- Styles -------------------------------- */

const cardSx = {
  bgcolor: '#F9FAFB',
  borderRadius: 3,
};

const pad = { xs: 2.5, md: 3.5 };

/* ------------------------------ Subcomponents ---------------------------- */

const ValueCard: React.FC<FeatureItem> = ({ icon, heading, description }) => (
  <Paper variant="outlined" sx={{ ...cardSx, height: '100%' }}>
    <Stack p={pad}>
      <Box component="img" src={icon.src} alt={icon.alt} sx={{ width: 44, height: 44 }} mb={4} />

      <Typography variant="subtitle1" fontWeight={700} mb={1}>
        {heading}
      </Typography>

      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Stack>
  </Paper>
);

/* --------------------------------- Main ---------------------------------- */

export const CoreValues: React.FC<CoreValuesProps> = (props) => {
  const { t } = useTranslate();

  const { heading, features, ...sectionProps } = {
    ...CoreValuesDefaults,
    ...props,
  };

  // guard: need 5 items to match layout; if fewer, it still renders responsively
  const [f1, f2, f3, f4, f5] = features;

  return (
    <Box component="section" {...sectionProps} py={{ xs: 8, md: 12, lg: 14 }} id="core-values">
      <Container>
        <Grid2
          container
          spacing={{ xs: 4, md: 6 }}
          alignItems="flex-start"
          display="flex"
          flexDirection="column"
        >
          {/* Left column: heading + intro */}
          <Grid2 size={{ xs: 12, md: 6 }}>
            <Typography
              component="h2"
              sx={{
                fontWeight: 500,
                fontSize: { xs: '2rem', md: '3rem', lg: '3rem' },
                lineHeight: 1.15,
                mb: { xs: 2, md: 3 },
              }}
            >
              {t(heading)}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t(
                'Our five guiding principles keep us focused on making crypto transparent, secure, and genuinely useful. They inform every roadmap decision, code review, and community vote.'
              )}
            </Typography>
          </Grid2>

          {/* Right column: card grid (3 on top, 2 wide on bottom) */}
          <Grid2 size={{ xs: 12, md: 12 }}>
            <Grid2 container spacing={{ xs: 2, md: 2 }}>
              {/* Row 1: three equal cards */}
              {f1 && (
                <Grid2 size={{ xs: 12, sm: 6, lg: 4 }}>
                  <ValueCard {...f1} />
                </Grid2>
              )}
              {f2 && (
                <Grid2 size={{ xs: 12, sm: 6, lg: 4 }}>
                  <ValueCard {...f2} />
                </Grid2>
              )}
              {f3 && (
                <Grid2 size={{ xs: 12, sm: 12, lg: 4 }}>
                  <ValueCard {...f3} />
                </Grid2>
              )}

              {/* Row 2: two wider cards */}
              {f4 && (
                <Grid2 size={{ xs: 12, lg: 6 }}>
                  <ValueCard {...f4} />
                </Grid2>
              )}
              {f5 && (
                <Grid2 size={{ xs: 12, lg: 6 }}>
                  <ValueCard {...f5} />
                </Grid2>
              )}
            </Grid2>
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  );
};

export default CoreValues;

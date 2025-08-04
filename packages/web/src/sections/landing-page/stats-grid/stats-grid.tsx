'use client';

import * as React from 'react';
import { useTranslate } from '@/locales';
import { trackEvent } from '@normalfinance/utils';

import Grid2 from '@mui/material/Grid2';
import { Box, Paper, Button, Container, Typography } from '@mui/material';

type StatsProps = {
  percentage: string;
  heading: string;
  description: string;
};

type Props = {
  tagline?: string;
  heading?: string;
  description?: string;
  stats?: StatsProps[];
};

export type StatsGridProps = React.ComponentPropsWithoutRef<'section'> & Props;

const DEFAULT_PROPS = {
  tagline: 'Tagline',
  heading: 'Trusted by thousands',
  description:
    'Normal powers the largest catalogue of synthetic crypto and real-world assets, with thousands of dollars in weekly volume across 100+ assets and index funds.',
  stats: [
    {
      percentage: '$340K',
      heading: 'All time volume',
      description: '',
    },
    {
      percentage: '2,000+',
      heading: 'All time swappers',
      description: '',
    },
    {
      percentage: 'Soon',
      heading: 'All time LP fees',
      description: '',
    },
    {
      percentage: 'Soon',
      heading: '+24H volume',
      description: '',
    },
  ],
};

const paperSx = {
  bgcolor: '#F9FAFB',
  borderRadius: 3,
};

const StatCard: React.FC<StatsProps> = ({ percentage, heading }) => (
  <Paper variant="outlined" sx={{ ...paperSx }}>
    <Box
      sx={{
        p: { xs: 2.5, md: 4 },
        height: '100%',
      }}
    >
      <Typography variant="h6" component="h3" fontWeight={400} sx={{ lineHeight: 1.4 }}>
        {heading}
      </Typography>

      <Typography
        component="p"
        fontWeight={500}
        sx={{
          fontSize: '48px',
          mt: { xs: 4, md: 5, lg: 6 },
          lineHeight: 1.3,
        }}
      >
        {percentage}
      </Typography>
    </Box>
  </Paper>
);

export const StatsGrid: React.FC<StatsGridProps> = ({
  tagline = DEFAULT_PROPS.tagline,
  heading = DEFAULT_PROPS.heading,
  description = DEFAULT_PROPS.description,
  stats = DEFAULT_PROPS.stats,
  ...sectionProps
}) => {
  const { t } = useTranslate();

  return (
    <Box
      component="section"
      sx={{
        px: '5%',
        py: { xs: 6, md: 8, lg: 10 },
      }}
      {...sectionProps}
    >
      <Container>
        <Grid2
          container
          spacing={{ xs: 6, lg: 8 }}
          alignItems="center"
          columns={{ xs: 1, lg: 12 }}
          height={1}
        >
          <Grid2
            size={{ xs: 12, lg: 5 }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              pt: { md: '0 !important' },
            }}
            height={1}
          >
            <Typography variant="h3" fontWeight={500} mb={2}>
              {heading}
            </Typography>

            <Box sx={{ mt: 'auto' }}>
              <Typography color="text.secondary" mb={2}>
                {description}
              </Typography>

              <Button
                variant="contained"
                sx={{
                  mt: 0.5,
                  borderRadius: 1,
                  bgcolor: '#6E4BFF',
                  '&:hover': { bgcolor: '#6E4BFF' },
                }}
                onClick={() =>
                  trackEvent('button_clicked', {
                    label: 'Learn more',
                    location: 'Home',
                  })
                }
              >
                {t('Learn more')}
              </Button>
            </Box>
          </Grid2>

          <Grid2 size={{ xs: 1, lg: 7 }}>
            <Grid2 container spacing={4}>
              {stats.map((s, i) => (
                <Grid2 size={{ xs: 12, md: 6 }} key={i}>
                  <StatCard {...s} />
                </Grid2>
              ))}
            </Grid2>
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  );
};

StatsGrid.displayName = 'StatsGrid';

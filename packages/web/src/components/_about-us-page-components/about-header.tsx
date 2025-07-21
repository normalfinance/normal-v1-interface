'use client';

import React from 'react';
import { useTranslate } from '@/locales';

import Grid2 from '@mui/material/Grid2';
import { Box, Container, Typography } from '@mui/material';

export const AboutHeader: React.FC = (props) => {
  const { t } = useTranslate();

  const { ...sectionProps } = { ...props };

  return (
    <Box component="section" {...sectionProps} py={{ xs: 8, md: 12, lg: 14 }}>
      <Container>
        <Grid2
          container
          spacing={{ xs: 1.5, lg: 5 }}
          alignItems="flex-start"
          mb={{ xs: 6, md: 9, lg: 10 }}
        >
          <Grid2 size={{ xs: 12, md: 6 }}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 500,
                fontSize: {
                  xs: '2rem',
                  md: '3rem',
                  lg: '4rem',
                },
                lineHeight: 1.1,
              }}
              gutterBottom
            >
              {t('Mission & Purpose')}
            </Typography>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <Typography variant="body1">
              {t(
                'At Normal, our mission is to make crypto normal—giving everyone friction‑free exposure to the entire digital‑asset ecosystem. We build fully on‑chain index tokens and wrapped assets so you can diversify, swap, lend, and earn across the top 200 cryptocurrencies directly from your favorite DEX—no bridges, no centralized exchanges, no hidden fees.'
              )}
            </Typography>
          </Grid2>
        </Grid2>
        <Box
          component="img"
          src="/assets/images/about/team1.webp"
          alt="Group image"
          sx={{
            width: '100%',
            objectFit: 'cover',
            borderRadius: 3,
            border: 5,
            borderStyle: 'solid',
            borderColor: 'divider',
          }}
        />
      </Container>
    </Box>
  );
};

export default AboutHeader;

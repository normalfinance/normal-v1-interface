'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { useRouter } from 'next/navigation';

import Grid2 from '@mui/material/Grid2';
import { Box, Link, Stack, Button, Container, Typography } from '@mui/material';

type LogoItem = {
  name: string;
  src: string;
  width: number;
  height: number;
  href?: string;
};

const DEFAULT_LOGOS: LogoItem[] = [
  {
    name: 'Stellar',
    src: cdn('homepage/stellar-logo.webp'),
    width: 82,
    height: 20,
    href: 'https://stellar.org/',
  },
   {
    name: 'Draper University',
    src: cdn('homepage/draper-university.webp'),
    width: 62,
    height: 20,
    href: 'https://draperuniversity.com/',
  },
  {
    name: 'Draper University Ventures',
    src: cdn('homepage/draper-university-ventures.webp'),
    width: 62,
    height: 20,
    href: 'https://draperuniversity.com/ventures',
  },
   {
    name: 'Blend Capital',
    src: cdn('homepage/blend-capital.png'),
    width: 62,
    height: 20,
    href: 'https://blend.capital/',
  },
   {
    name: 'DeFindex',
    src: cdn('homepage/defiindex.png'),
    width: 78,
    height: 20,
    href: 'https://www.defindex.io/',
  },
  {
    name: 'Halborn',
    src: cdn('homepage/halborn-logo.webp'),
    width: 113,
    height: 13,
    href: 'https://www.halborn.com/',
  },
];

export const AboutHeader: React.FC = () => {
  const { t } = useTranslate();
  const router = useRouter();

  const handleScrollToVision = () => {
    const section = document.getElementById('our-vision');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Box
      component="section"
      py={{ xs: 8, md: 12, lg: 14 }}
      sx={(theme) => ({
        bgcolor: theme.palette.grey[50],
        ...theme.applyStyles('dark', { bgcolor: theme.palette.grey[900] }),
      })}
    >
      <Container>
        <Grid2 size={{ xs: 12, md: 6 }} mb={{ xs: 2, md: 4 }}>
          <Box
            sx={{
              display: 'inline-flex',
              borderRadius: 1,
              fontSize: 12,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'background.paper' },
              color: 'text.primary',
              border: 1,
              borderColor: 'divider',
              px: 1,
              py: 0.5,
              fontWeight: 'bold',
            }}
          >
            {t('About')}
          </Box>
        </Grid2>
        <Grid2
          container
          spacing={{ xs: 1.5, lg: 5 }}
          alignItems="flex-start"
          justifyContent="space-between"
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
              {t('Our Mission & Purpose')}
            </Typography>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 5 }}>
            <Typography variant="body1" color="text.secondary">
              {t(
                'At Normal, our mission is to make crypto normal - starting with a savings account that pays real yield, works for everyone, and puts you in full control of your money.'
              )}
            </Typography>
            <Stack direction="row" gap={2} mt={4}>
              <Button
                variant="contained"
                size="large"
                onClick={handleScrollToVision}
                sx={{
                  borderRadius: 2,
                  bgcolor: 'secondary.light',
                  '&:hover': { bgcolor: 'secondary.light' },
                  color: 'text.primary',
                }}
              >
                {t('Our vision')}
              </Button>

              {/* Navigate to /roadmap */}
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/roadmap')}
                sx={{
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'background.paper' },
                  color: 'text.primary',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                {t('Roadmap')}
              </Button>
            </Stack>
          </Grid2>
        </Grid2>
        <Box
          component="img"
          src={cdn('about-page/meridian.webp')}
          alt="Group image"
          sx={{
            width: '100%',
            objectFit: 'cover',
            borderRadius: 3,
          }}
        />

        <Box mt={6}>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={6}>
            {t('Trusted by 3K+ Businesses and Individuals')}
          </Typography>

          <Stack
            direction="row"
            flexWrap="wrap"
            justifyContent="center"
            alignItems="center"
            gap={4}
            sx={{ opacity: 0.8 }}
          >
            {DEFAULT_LOGOS.map((logo) => {
              const img = (
                <Box
                  component="img"
                  key={logo.name}
                  src={logo.src}
                  alt={logo.name}
                  width={logo.width}
                  height={logo.height}
                  loading="lazy"
                  className="object-contain"
                />
              );

              return logo.href ? (
                <Link key={logo.name} href={logo.href} target="_blank" rel="noreferrer noopener">
                  {img}
                </Link>
              ) : (
                <span key={logo.name}>{img}</span>
              );
            })}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default AboutHeader;

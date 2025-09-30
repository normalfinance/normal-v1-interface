'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import Grid2 from '@mui/material/Grid2';
import { Box, Button, Container, Link, Stack, Typography } from '@mui/material';

type LogoItem = {
  name: string;
  src: string;
  width: number;
  height: number;
  href?: string;
};

const DEFAULT_LOGOS: LogoItem[] = [
  {
    name: 'Notion',
    src: '/assets/images/landing-page/stellar-logo.webp',
    width: 82,
    height: 20,
    href: 'https://www.notion.so',
  },
  {
    name: 'Mailchimp',
    src: '/assets/images/landing-page/halborn-logo.webp',
    width: 113,
    height: 13,
    href: 'https://mailchimp.com',
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
    <Box component="section" py={{ xs: 8, md: 12, lg: 14 }} bgcolor="#F9FAFB">
      <Container>
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
            <Typography variant="body1" color="grey.700">
              {t(
                'At Normal Finance, our mission is to make crypto normal—giving everyone friction‑free exposure to the entire digital‑asset ecosystem.'
              )}
            </Typography>
            <Stack direction="row" gap={2} mt={4}>
              <Button
                variant="contained"
                onClick={handleScrollToVision}
                sx={{
                  borderRadius: 1,
                  bgcolor: 'text.primary',
                  '&:hover': { bgcolor: 'text.primary' },
                }}
              >
                {t('Our vision')}
              </Button>

              {/* Navigate to /roadmap */}
              <Button
                variant="contained"
                onClick={() => router.push('/roadmap')}
                sx={{
                  borderRadius: 1,
                  bgcolor: 'text.secondary',
                  '&:hover': { bgcolor: 'text.secondary' },
                }}
              >
                {t('Roadmap')}
              </Button>
            </Stack>
          </Grid2>
        </Grid2>
        <Box
          component="img"
          src="/assets/images/about/meridian.webp"
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

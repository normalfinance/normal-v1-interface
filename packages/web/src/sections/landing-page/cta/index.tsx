'use client';

import * as React from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { trackEvent } from '@normalfinance/utils';

import { Box, Stack, Button, Container, Typography, type ButtonProps } from '@mui/material';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  heading: string;
  description: string;
  buttons: (ButtonProps & { title: string })[];
  /** background image path - must be an absolute or public-dir URL */
  image?: string;
};

export type CtaImageProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const CtaImage: React.FC<CtaImageProps> = ({
  heading = 'Ready to make crypto feel Normal? Start swapping, investing, and exploring.',
  description = '',
  buttons = [
    { title: 'Button', variant: 'contained', color: 'primary' },
    { title: 'Button', variant: 'outlined', color: 'primary' },
  ],
  image = '/assets/images/landing-page/cta-bg.webp',
  ...sectionProps
}) => {
  const { t } = useTranslate();

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: '5%',

        py: { xs: 6, md: 12, lg: 14 },
        color: 'common.white',
      }}
      {...sectionProps}
    >
      <Container sx={{ position: 'relative', zIndex: 1 }}>
        {/* ---------- Background image (inside container) ---------- */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: 3, // 24 px (theme.spacing(3) = 24)
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <Box
            component="img"
            src={image}
            alt=""
            sx={{
              position: 'absolute',
              inset: 0,
              width: 1,
              height: 1,
              objectFit: 'cover',
            }}
          />
        </Box>

        {/* ---------- Foreground content ---------- */}
        <Stack
          spacing={4}
          alignItems="center"
          textAlign="center"
          sx={{
            position: 'relative',
            zIndex: 2,
            px: { xs: '24px', md: '64px' },
            py: { xs: '32px', md: '80px' },
          }}
        >
          <Typography variant="h3" fontWeight={500} sx={{ fontSize: { xs: '24px', md: '40px' } }}>
            {heading}
          </Typography>

          <Button
            href={paths.swap}
            sx={{
              border: '1px solid #6E4BFF',
              backgroundColor: '#E0D9FF',
              color: '#6E4BFF',
              fontWeight: 500,
            }}
            onClick={() =>
              trackEvent('button_clicked', {
                label: 'Start swapping now',
                location: 'Home',
              })
            }
          >
            {t('Start swapping now')}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};

CtaImage.displayName = 'CtaImage';

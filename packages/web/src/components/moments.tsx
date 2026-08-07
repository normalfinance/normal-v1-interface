'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import { Box, Typography } from '@mui/material';

type ImageProps = {
  url?: string;
  src: string;
  alt?: string;
};

type Props = {
  heading: string;
  description: string;
  images: ImageProps[];
};

export type MomentsProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

export const MomentsDefaults: Props = {
  heading: 'Moments That Matter',
  description:
    'From impromptu coffee runs to cross-team hackathons and Meridian conferences — these snapshots capture the energy, laughter, and collaboration that fuel our day-to-day.',
  images: [
    { url: '#', src: cdn('about-page/t1.webp'), alt: 'Team image 1' },
    { url: '#', src: cdn('about-page/img2.webp'), alt: 'Team image 2' },
    { url: '#', src: cdn('about-page/t3.webp'), alt: 'Team image 3' },
    { url: '#', src: cdn('about-page/img3.webp'), alt: 'Team image 4' },
    { url: '#', src: cdn('about-page/t5.webp'), alt: 'Team image 5' },
    { url: '#', src: cdn('about-page/img4.webp'), alt: 'Team image 6' },
  ],
};

export const Moments: React.FC<MomentsProps> = (props) => {
  const { description, images, ...sectionProps } = {
    ...MomentsDefaults,
    ...props,
  };

  const { t } = useTranslate();

  return (
    <Box
      component="section"
      {...sectionProps}
      sx={{ bgcolor: '#FAFAFB', pt: { xs: '40px', md: '56px' }, pb: { xs: '80px', md: '110px' } }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {/* Header */}
        <Box mb={{ xs: '40px', md: '56px' }} sx={{ textAlign: 'center' }}>
          <Typography
            sx={{
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#6B6B76',
              mb: 1.5,
            }}
          >
            — Culture
          </Typography>
          <Typography
            component="h2"
            sx={{
              fontWeight: 500,
              fontSize: 'clamp(32px, 4vw, 52px)',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#0A0A0F',
              mb: '16px',
            }}
          >
            Moments That{' '}
            <Box
              component="span"
              sx={{
                background:
                  'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Matter
            </Box>
          </Typography>
          <Typography
            sx={{
              fontSize: '16px',
              color: '#6B6B76',
              lineHeight: 1.55,
              maxWidth: '520px',
              mx: 'auto',
            }}
          >
            {t(description)}
          </Typography>
        </Box>

        {/* Masonry gallery */}
        <Box
          sx={{
            columnCount: { xs: 1, sm: 2, md: 3 },
            columnGap: '16px',
          }}
        >
          {images.map((image, index) => (
            <Box
              key={index}
              sx={{
                breakInside: 'avoid',
                mb: '16px',
                borderRadius: '16px',
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={image.src}
                alt={image.alt}
                loading="lazy"
                sx={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  display: 'block',
                  objectFit: 'cover',
                  transition: 'transform 300ms ease',
                  '&:hover': { transform: 'scale(1.02)' },
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Moments;

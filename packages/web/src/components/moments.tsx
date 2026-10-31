'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import { Box } from '@mui/material';

import { PageSection, GradientText, SectionHeader } from '@/components/_common/brand';

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
  const { description, images } = {
    ...MomentsDefaults,
    ...props,
  };

  const { t } = useTranslate();

  return (
    <PageSection>
      <SectionHeader
        eyebrow="Culture"
        title={
          <>
            Moments That <GradientText>Matter</GradientText>
          </>
        }
        subtitle={t(description)}
      />

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
              borderRadius: 'var(--radius-lg)',
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
              }}
            />
          </Box>
        ))}
      </Box>
    </PageSection>
  );
};

export default Moments;

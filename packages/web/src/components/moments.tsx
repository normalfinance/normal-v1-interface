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
    { url: '#', src: cdn('about-page/img2.webp'), alt: 'Team image 2' },
    { url: '#', src: cdn('about-page/t1.webp'), alt: 'Team image 1' },
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

      {/* Mosaic: the first photo leads, the last fills the phone grid's odd slot */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {images.map((image, index) => {
          const lead = index === 0;
          const last = index === images.length - 1;
          return (
            <Box
              key={image.src}
              sx={{
                position: 'relative',
                minWidth: 0,
                overflow: 'hidden',
                borderRadius: 'var(--radius-lg)',
                gridColumn: { xs: lead || last ? 'span 2' : 'auto', md: lead ? 'span 2' : 'auto' },
                gridRow: { md: lead ? 'span 2' : 'auto' },
                aspectRatio: {
                  xs: lead || last ? '3 / 2' : '1 / 1',
                  md: lead ? 'auto' : '4 / 3',
                },
              }}
            >
              {/* Absolute, so a tall photo can't stretch the grid's rows */}
              <Box
                component="img"
                src={image.src}
                alt={image.alt}
                loading="lazy"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: lead ? 'center 70%' : 'center 30%',
                }}
              />
            </Box>
          );
        })}
      </Box>
    </PageSection>
  );
};

export default Moments;

'use client';

import React from 'react';

import { Box, Container, Typography } from '@mui/material';

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
  heading: 'Moments That Matter ❤',
  description:
    'We believe great work starts with great relationships. From impromptu coffee runs to cross-team hackathons and weekend hikes, these snapshots capture the energy, laughter, and collaboration that fuel our day-to-day.',
  images: [
    {
      url: '#',
      src: '/assets/images/about/t1.webp',
      alt: 'Team image 1',
    },
    {
      url: '#',
      src: '/assets/images/about/t2.webp',
      alt: 'Team image 2',
    },
    {
      url: '#',
      src: '/assets/images/about/t3.webp',
      alt: 'Team image 3',
    },
    {
      url: '#',
      src: '/assets/images/about/t4.webp',
      alt: 'Team image 4',
    },
    {
      url: '#',
      src: '/assets/images/about/t5.webp',
      alt: 'Team image 5',
    },

    {
      url: '#',
      src: '/assets/images/about/t7.webp',
      alt: 'Team image 7',
    },
  ],
};

export const Moments: React.FC<MomentsProps> = (props) => {
  const { heading, description, images, ...sectionProps } = {
    ...MomentsDefaults,
    ...props,
  };

  return (
    <Box
      component="section"
      {...sectionProps}
      py={{ xs: 8, md: 12, lg: 14 }}
      sx={{ backgroundColor: '#F9FAFB' }}
    >
      <Container>
        <Box textAlign="left" mb={{ xs: 6, md: 9, lg: 10 }} maxWidth={600} mx="center">
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

        <Box
          sx={{
            columnCount: { xs: 1, md: 3 },
            columnGap: (theme) => theme.spacing(3),
          }}
        >
          {images.map((image, index) => {
            const ImgElement = (
              <Box
                component="img"
                src={image.src}
                alt={image.alt}
                loading="lazy"
                sx={{
                  width: '100%',
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: 5,
                  borderStyle: 'solid',
                  borderColor: 'divider',
                  mb: 3,
                }}
              />
            );

            return (
              <Box key={index} sx={{ breakInside: 'avoid' }}>
                {ImgElement}
              </Box>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
};

export default Moments;

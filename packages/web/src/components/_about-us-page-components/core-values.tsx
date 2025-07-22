'use client';

import type { MotionStyle } from 'framer-motion';

import React, { useRef } from 'react';
import { useTranslate } from '@/locales';
import { m, useScroll, useTransform } from 'framer-motion';

import Grid2 from '@mui/material/Grid2';
import { Box, Container, Typography } from '@mui/material';

type FeatureItem = {
  icon: {
    src: string;
    alt: string;
  };
  heading: string;
  description: string;
};

type Props = {
  heading: string;
  features: FeatureItem[];
};

export type CoreValuesProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

export const CoreValuesDefaults: Props = {
  heading: 'Core Values',
  features: [
    {
      icon: {
        src: '/assets/images/about/i1.svg',
        alt: 'Icon 1',
      },
      heading: 'Keep Crypto Human',
      description: 'Remove complexity, speak plainly, design for real people.',
    },
    {
      icon: {
        src: '/assets/images/about/i2.svg',
        alt: 'Icon 2',
      },
      heading: 'Security First',
      description: 'Audited contracts, battle‑tested code, and 24/7 monitoring.',
    },
    {
      icon: {
        src: '/assets/images/about/i3.svg',
        alt: 'Icon 3',
      },
      heading: 'Permissionless Innovation',
      description: 'Build composable primitives that anyone can extend.',
    },
    {
      icon: {
        src: '/assets/images/about/i4.svg',
        alt: 'Icon 4',
      },
      heading: 'Community Ownership',
      description: 'NORM token holders create and vote on proposals.',
    },
    {
      icon: {
        src: '/assets/images/about/i5.svg',
        alt: 'Icon 5',
      },
      heading: 'Data > Hype',
      description: 'Let on‑chain metrics guide every product decision.',
    },
  ],
};

export const CoreValues: React.FC<CoreValuesProps> = (props) => {
  const { t } = useTranslate();

  const { heading, features, ...sectionProps } = {
    ...CoreValuesDefaults,
    ...props,
  };

  return (
    <Box
      component="section"
      {...sectionProps}
      py={{ xs: 8, md: 12, lg: 14, backgroundColor: '#F9FAFB' }}
    >
      <Container>
        <Grid2 container spacing={{ xs: 4, md: 6 }} alignItems="flex-start">
          <Grid2 size={{ xs: 12, md: 6 }}>
            <Typography
              component="h2"
              sx={{
                fontWeight: 500,
                fontSize: {
                  xs: '2rem',
                  md: '3rem',
                  lg: '3rem',
                },
                lineHeight: 1.15,
                mb: { xs: 2, md: 3 },
              }}
            >
              {t(heading)}
            </Typography>
            <Typography variant="body1">
              {t(
                'Our five guiding principles keep us focused on making crypto transparent, secure, and genuinely useful. They inform every roadmap decision, code review, and community vote.'
              )}
            </Typography>
          </Grid2>

          <Grid2 size={{ xs: 12, md: 6 }} position="relative">
            <AnimationSection />
            {features.map((feature, index) => (
              <Box key={index} display="flex" gap={{ xs: 3, lg: 5 }} py={4}>
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="flex-start"
                  position="relative"
                  pt={0}
                >
                  <Box
                    sx={{
                      backgroundColor: 'background.paper',
                      width: 64,
                      height: 64,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      border: 1,
                      borderColor: 'divider',
                      zIndex: 10,
                    }}
                  >
                    <Box
                      component="img"
                      src={feature.icon.src}
                      alt={feature.icon.alt}
                      sx={{ width: 32, height: 32 }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography
                    variant="h6"
                    sx={{ mb: { xs: 1, md: 1.5 }, fontWeight: 700, lineHeight: 1.4 }}
                  >
                    {t(feature.heading)}
                  </Typography>
                  <Typography variant="body2">{t(feature.description)}</Typography>
                </Box>
              </Box>
            ))}
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  );
};

const AnimationSection = () => {
  const scrollSection = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollSection,
    offset: ['start 55%', 'start start'],
  });
  const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '10%',
        left: '32px',
        width: '2px',
        height: '75%',
        bgcolor: 'rgba(0,0,0,0.15)',
      }}
    >
      <m.div
        ref={scrollSection}
        style={
          {
            height,
            width: '100%',
            backgroundColor: 'black',
          } as MotionStyle
        }
      />
    </Box>
  );
};

export default CoreValues;

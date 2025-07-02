'use client';

import * as React from 'react';
import {
  Avatar,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  type ButtonProps,
} from '@mui/material';
import { Icon } from '@iconify/react';
import Masonry from '@mui/lab/Masonry';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ImageProps = { src: string; alt?: string };

type Testimonial = {
  quote: string;
  avatar: ImageProps;
  name: string;
  position: string;
  numberOfStars: number;
};

type Props = {
  heading: string;
  description: string;
  testimonials: Testimonial[];
  cta?: ButtonProps & { title: string };
};

export type TestimonialGridProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

const paperSx = {
  bgcolor: '#F9FAFB',
  borderRadius: 2,
};

/* ------------------------------------------------------------------ */
/*  Card component                                                     */
/* ------------------------------------------------------------------ */

const TestimonialCard: React.FC<Testimonial> = ({
  quote,
  avatar,
  name,
  position,
  numberOfStars,
}) => (
  <Paper
    variant="outlined"
    sx={{
      ...paperSx,
      p: { xs: 3, md: 4 },
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* stars */}
    <Box mb={{ xs: 2.5, md: 3 }} display="flex">
      {Array.from({ length: numberOfStars }).map((_, i) => (
        <Icon // ⬅︎ use Iconify
          key={i}
          icon="material-symbols:star-rounded"
          width={24}
          height={24}
          style={{ color: '#FFAB00', marginRight: '0px' }} // 4 px ≈ .5 spacing
        />
      ))}
    </Box>

    {/* quote */}
    <Typography variant="body1" mb={{ xs: 2.5, md: 3 }}>
      {quote}
    </Typography>

    {/* author block */}
    <Stack direction="row" spacing={2} alignItems="center" mt="auto">
      <Avatar src={avatar.src} alt={avatar.alt} sx={{ width: 48, height: 48 }} />
      <Box>
        <Typography fontWeight={600}>{name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {position}
        </Typography>
      </Box>
    </Stack>
  </Paper>
);

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const TestimonialGrid: React.FC<TestimonialGridProps> = ({
  heading,
  description,
  testimonials,
  cta,
  ...sectionProps
}) => (
  <Box component="section" sx={{ px: '5%', py: { xs: 6, md: 12, lg: 14 } }} {...sectionProps}>
    <Container disableGutters>
      {/* header */}
      <Stack spacing={2} maxWidth={640} mx="auto" textAlign="center" mb={{ xs: 6, md: 8 }}>
        <Typography variant="h2" fontWeight={500}>
          {heading}
        </Typography>
      </Stack>

      {/* masonry grid */}
      <Masonry columns={{ xs: 1, md: 2, lg: 3 }} sx={{ m: 0 }} spacing={2}>
        {(testimonials ?? []).map((t, i) => (
          <TestimonialCard key={i} {...t} />
        ))}
      </Masonry>
    </Container>
  </Box>
);

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

export const TestimonialGridDefaults: Props = {
  heading: 'Customer testimonials',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  testimonials: [
    {
      quote:
        '"Normal saves me time and money - all while being as easy to use as my traditional banking apps."',
      avatar: { src: '/assets/images/testimonials/1.webp' },
      name: 'Devin Kopp',
      position: 'Co-founder @ Rodeo Money',
      numberOfStars: 5,
    },
    {
      quote:
        '"Instead of picking out each coin, Normal allows you to invest in the whole market at once. Normal makes it a no brainer."',
      avatar: { src: '/assets/images/testimonials/2.webp' },
      name: 'Jake Penzato',
      position: 'Student at Aurora University',
      numberOfStars: 5,
    },
    {
      quote:
        '"Normal is a platform that simplifies investing into crypto. The platform is very clean and easy to use."',
      avatar: { src: '/assets/images/testimonials/3.webp' },
      name: 'Victor Acevedo',
      position: 'An OG normie',
      numberOfStars: 5,
    },
  ],
  cta: { title: 'Read more success stories', variant: 'outlined' },
};

TestimonialGrid.defaultProps = TestimonialGridDefaults;
TestimonialGrid.displayName = 'TestimonialGrid';

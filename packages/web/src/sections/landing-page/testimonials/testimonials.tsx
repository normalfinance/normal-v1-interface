'use client';

import * as React from 'react';
import { Icon } from '@iconify/react';

import Masonry from '@mui/lab/Masonry';
import {
  Box,
  Paper,
  Stack,
  Avatar,
  Container,
  Typography,
  Button,
  type ButtonProps,
} from '@mui/material';
import { useTranslate } from '@/locales';

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
  description?: string;
  testimonials: Testimonial[];
  cta?: ButtonProps & { title: string };
};

export type TestimonialGridProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

/* ------------------------------------------------------------------ */
/*  Card component                                                     */
/* ------------------------------------------------------------------ */

const paperSx = {
  bgcolor: '#F9FAFB',
  borderRadius: 2,
};

const TestimonialCard: React.FC<Testimonial> = ({
  quote,
  avatar,
  name,
  position,
  numberOfStars,
}) => {
  const { t } = useTranslate();

  return (
    <Paper
      variant="outlined"
      sx={{
        ...paperSx,
        p: { xs: 3, md: 4 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box mb={{ xs: 2.5, md: 3 }} display="flex">
        {Array.from({ length: numberOfStars }).map((_, i) => (
          <Icon
            key={i}
            icon="material-symbols:star-rounded"
            width={24}
            height={24}
            style={{ color: '#FFAB00' }}
          />
        ))}
      </Box>

      <Typography variant="body1" mb={{ xs: 2.5, md: 3 }}>
        {t(quote)}
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" mt="auto">
        <Avatar src={avatar.src} alt={avatar.alt} sx={{ width: 48, height: 48 }} />
        <Box>
          <Typography fontWeight={600}>{t(name)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t(position)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const TestimonialGrid: React.FC<TestimonialGridProps> = ({
  heading,
  description,
  testimonials,
  cta,
  ...sectionProps
}) => {
  const { t } = useTranslate();

  return (
    <Box component="section" sx={{ px: '5%', py: { xs: 6, md: 12, lg: 14 } }} {...sectionProps}>
      <Container disableGutters>
        <Stack spacing={2} maxWidth={640} mx="auto" textAlign="center" mb={{ xs: 6, md: 8 }}>
          <Typography variant="h2" fontWeight={500}>
            {t(heading ?? '')}
          </Typography>
          {description && <Typography color="text.secondary">{t(description)}</Typography>}
        </Stack>

        <Masonry columns={{ xs: 1, md: 2, lg: 3 }} sx={{ m: 0 }} spacing={2}>
          {(testimonials ?? []).map((tItem, i) => (
            <TestimonialCard key={i} {...tItem} />
          ))}
        </Masonry>

        {cta && (
          <Box textAlign="center" mt={{ xs: 6, md: 8 }}>
            <Button variant={cta.variant ?? 'outlined'}>{t(cta.title)}</Button>
          </Box>
        )}
      </Container>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

export const TestimonialGridDefaults: Props = {
  heading: 'Customer testimonials',
  description: '',
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

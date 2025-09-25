'use client';

import * as React from 'react';
import { Icon } from '@iconify/react';
import { useTranslate } from '@/locales';

import Masonry from '@mui/lab/Masonry';
import { Box, Paper, Stack, Avatar, Container, Typography, type ButtonProps } from '@mui/material';

type ImageProps = { src: string; alt?: string };

type Testimonial = {
  quote: string;
  avatar: ImageProps;
  name: string;
  position: string;
  numberOfStars: number;
};

type CTA = {
  title: string;
  variant?: 'text' | 'outlined' | 'contained';
} & Omit<ButtonProps, 'variant'>;

type Props = {
  heading?: string;
  description?: string;
  testimonials?: Testimonial[];
  cta?: CTA;
};

export type TestimonialGridProps = React.ComponentPropsWithoutRef<'section'> & Props;

const DEFAULT_PROPS = {
  heading: 'Customer testimonials',
  description: '',
  testimonials: [
    {
      quote:
        '"Whether you’re new to crypto or a long standing investor I would highly recommend checking out Normal Finance. Through Normal’s investment indexes, you have the opportunity to invest in many components within the market, as well as still zeroing in on individual crypto’s should choose that direction."',
      avatar: { src: '/assets/images/testimonials/4.webp' },
      name: 'Dr. McGuire',
      position: 'Doctor of Education (Ed. D.)',
      numberOfStars: 5,
    },
    {
      quote: `"In crypto, you're not just investing in tokens; you're investing in a team. The Normal team’s drive and positive energy are truly building something special that’s inclusive to everyone."`,
      avatar: { src: '/assets/images/testimonials/6.webp' },
      name: 'Raphael Fortin',
      position: 'Co-founder at Lumen Loop',
      numberOfStars: 5,
    },
    {
      quote:
        '"Hito Wallet, crypto friendly hardware, looks forward to storing Normal Crypto Index tokens."',
      avatar: { src: '/assets/images/testimonials/5.webp' },
      name: 'Mikhail Kirillov',
      position: 'Founder of Hito Wallet',
      numberOfStars: 5,
    },
    {
      quote: `"Normal Crypto Indexes make financial freedom easy for my family."`,
      avatar: { src: '/assets/images/testimonials/7.webp' },
      name: 'Richie Lewis',
      position: 'Professional Fighter and World Champion Wrestler',
      numberOfStars: 5,
    },
    {
      quote: `"Normal has the best team and makes crypto investing simpler, smarter, and exactly how it should be."`,
      avatar: { src: '/assets/images/testimonials/8.webp' },
      name: 'Zahid Valencia',
      position: 'Professional USA Wrestler',
      numberOfStars: 5,
    },
    {
      quote: `"Normal makes crypto investing automated and customizable, perfect for users to diversify."`,
      avatar: { src: '/assets/images/testimonials/10.webp' },
      name: 'Roshan Vadassery',
      position: 'Founder of Permissionaless.net and Crypto Influencer',
      numberOfStars: 5,
    },
    {
      quote: `"Shoutout to Normal Crypto Indexes! Excited for the new protocol and token!"`,
      avatar: { src: '/assets/images/testimonials/9.webp' },
      name: 'Lor Albrighi',
      position: 'Founder of SPIN.FASHION',
      numberOfStars: 5,
    },
    {
      quote: `"The Normal Team is legendary and their vision is clear with Normal Crypto Indexes."`,
      avatar: { src: '/assets/images/testimonials/14.webp' },
      name: 'Shabbir Khan',
      position: 'Crypto pioneer & investor',
      numberOfStars: 5,
    },
    {
      quote: `"Normal has made transitioning from traditional finance to DeFi effortless by streamlining the entire investing process. It serves as the perfect bridge connecting the old world with the new."`,
      avatar: { src: '/assets/images/testimonials/13.webp' },
      name: 'Clair Gamoke',
      position: 'Head of Community at Bitcoin OS',
      numberOfStars: 5,
    },
    {
      quote: `"I believe in the Normal Team and their mission of crypto indexes. I look forward to supporting them!"`,
      avatar: { src: '/assets/images/testimonials/12.webp' },
      name: 'Nima Beheshtian',
      position: 'Head of Business at Luganodes',
      numberOfStars: 5,
    },
    {
      quote: `"The Normal team is beast and their product is awesome! I aspire to be Normal!"`,
      avatar: { src: '/assets/images/testimonials/11.webp' },
      name: 'Srijeth Padmesh',
      position: 'Growth at Reclaim Protocol',
      numberOfStars: 5,
    },
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
};

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

export const TestimonialGrid: React.FC<TestimonialGridProps> = ({
  heading = DEFAULT_PROPS.heading,
  description = DEFAULT_PROPS.description,
  testimonials = DEFAULT_PROPS.testimonials,
  ...sectionProps
}) => {
  const { t } = useTranslate();

  return (
    <Box component="section" sx={{ px: '5%', py: { xs: 6, md: 12, lg: 14 } }} {...sectionProps}>
      <Container disableGutters>
        <Stack spacing={2} maxWidth={640} mx="auto" textAlign="center" mb={{ xs: 6, md: 8 }}>
          <Typography variant="h2" fontWeight={500}>
            {t(heading)}
          </Typography>
          {description && <Typography color="text.secondary">{t(description)}</Typography>}
        </Stack>

        <Masonry columns={{ xs: 1, md: 2, lg: 3 }} sx={{ m: 0 }} spacing={2}>
          {testimonials.map((tItem, i) => (
            <TestimonialCard key={i} {...tItem} />
          ))}
        </Masonry>
      </Container>
    </Box>
  );
};

TestimonialGrid.displayName = 'TestimonialGrid';

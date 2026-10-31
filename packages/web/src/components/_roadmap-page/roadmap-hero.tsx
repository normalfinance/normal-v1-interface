'use client';

import React from 'react';

import { Box } from '@mui/material';

import {
  LiveDot,
  HeroLede,
  MetaItem,
  HeroBadge,
  HeroTitle,
  PageSection,
  GradientText,
  HAIRLINE_ON_DARK,
} from '@/components/_common/brand';

const META = [
  { label: 'Shipped', value: '7' },
  { label: 'In progress', value: '3' },
  { label: 'Planned', value: '5' },
  { label: 'Next ship', value: 'August 2026' },
];

export const RoadmapHero: React.FC = () => (
  <PageSection tone="dark">
    <HeroBadge tone="dark">
      <LiveDot tone="dark" />
      Roadmap · updated weekly
    </HeroBadge>

    <HeroTitle tone="dark">
      Where we&apos;re headed <GradientText>next.</GradientText>
    </HeroTitle>

    <HeroLede tone="dark">
      Most people earn next to nothing on their savings. Normal is built to change that — starting
      with a USDC savings account that pays real yield, with no bank in the middle.
    </HeroLede>

    {/* Meta row */}
    <Box
      sx={{
        mt: 5,
        pt: 3,
        borderTop: HAIRLINE_ON_DARK,
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
        gap: 3,
      }}
    >
      {META.map((item) => (
        <MetaItem key={item.label} tone="dark" label={item.label} value={item.value} />
      ))}
    </Box>
  </PageSection>
);

export default RoadmapHero;

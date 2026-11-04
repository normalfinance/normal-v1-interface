'use client';

import React from 'react';
import { paths } from '@/routes/paths';

import { Stack } from '@mui/material';

import {
  LiveDot,
  HeroLede,
  HeroBadge,
  HeroTitle,
  BrandButton,
  PageSection,
  GradientText,
} from '@/components/_common/brand';

export const CtaCommunity: React.FC = () => (
  <PageSection tone="dark" sx={{ textAlign: 'center' }}>
    <Stack alignItems="center">
      <HeroBadge tone="dark">
        <LiveDot tone="dark" />
        Join the community
      </HeroBadge>

      <HeroTitle tone="dark" component="h2">
        Help us achieve <GradientText>our mission.</GradientText>
      </HeroTitle>

      <HeroLede tone="dark" sx={{ mx: 'auto', maxWidth: 520 }}>
        Every milestone on this page is shaped by feedback from real users. Tell us what to build
        next.
      </HeroLede>

      <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1.5} sx={{ mt: 4 }}>
        <BrandButton
          tone="dark"
          href={paths.socials.twitter}
          target="_blank"
          rel="noopener noreferrer"
        >
          Follow us on X →
        </BrandButton>
        <BrandButton
          tone="dark"
          emphasis="secondary"
          href={paths.socials.discord}
          target="_blank"
          rel="noopener noreferrer"
        >
          Join our Discord
        </BrandButton>
      </Stack>
    </Stack>
  </PageSection>
);

CtaCommunity.displayName = 'CtaCommunity';
export default CtaCommunity;

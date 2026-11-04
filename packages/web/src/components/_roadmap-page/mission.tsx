'use client';

import React from 'react';

import { Box, Typography } from '@mui/material';

import { HAIRLINE, MONO_FONT, PageSection, SectionHeader } from '@/components/_common/brand';

const PRINCIPLES = [
  {
    n: '01',
    title: 'Simplicity first',
    description: 'Deposit in minutes. Earn automatically. No strategy required.',
  },
  {
    n: '02',
    title: 'Transparency & sovereignty',
    description:
      'Your funds are yours at all times. Every rate, balance and transaction is verifiable on-chain.',
  },
  {
    n: '03',
    title: 'Composability & reach',
    description:
      'Built on Stellar and designed to plug into the broader DeFi stack — with real assets coming soon.',
  },
  {
    n: '04',
    title: 'Community-led evolution',
    description:
      'We build in public. Our roadmap is open, our decisions are explained, your feedback shapes what gets built.',
  },
];

export const MissionSection: React.FC = () => (
  <PageSection>
    <SectionHeader
      eyebrow="How we build"
      title="Four principles, no shortcuts."
      subtitle="They guide every milestone on this page, and every line of code we ship."
    />

    {/* Numbered list */}
    <Box>
      {PRINCIPLES.map((item) => (
        <Box
          key={item.n}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '48px 1fr', md: '80px 1.4fr 2fr' },
            gap: { xs: '16px', md: '40px' },
            alignItems: 'start',
            py: { xs: '22px', md: '28px' },
            borderTop: HAIRLINE,
            '&:last-child': { borderBottom: HAIRLINE },
          }}
        >
          <Typography
            sx={{
              fontSize: '20px',
              fontWeight: 400,
              color: '#9A9AA3',
              letterSpacing: '-0.02em',
              fontFamily: MONO_FONT,
              pt: { xs: 0, md: '2px' },
            }}
          >
            {item.n}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '18px', md: '20px' },
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
              color: '#0A0A0F',
            }}
          >
            {item.title}
          </Typography>
          <Typography
            sx={{
              fontSize: '16px',
              color: '#6B6B76',
              lineHeight: 1.55,
              gridColumn: { xs: '2', md: 'auto' },
            }}
          >
            {item.description}
          </Typography>
        </Box>
      ))}
    </Box>
  </PageSection>
);

export default MissionSection;

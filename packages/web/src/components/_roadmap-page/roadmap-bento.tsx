'use client';

import React from 'react';

import { Box, Typography } from '@mui/material';

import {
  Eyebrow,
  HAIRLINE,
  BLOCK_SX,
  MONO_FONT,
  BrandButton,
  PageSection,
  BandBackdrop,
  GradientText,
  SectionHeader,
  HAIRLINE_ON_DARK,
} from '@/components/_common/brand';

const SMALL_CARDS = [
  {
    eyebrow: 'Cash in & out',
    title: '50+ countries, one tap.',
    description:
      'Fiat ramps via Stripe, Coinbase, MoonPay, SEPA and ACH. Deposits clear in minutes, not days.',
  },
  {
    eyebrow: 'Full transparency',
    title: 'Every balance, on-chain.',
    description:
      'Verify each rate, balance and transaction yourself. No black boxes, no asterisks, no surprises.',
  },
  {
    eyebrow: 'More assets coming',
    title: 'Crypto, equities and RWAs.',
    description:
      'BTC and ETH next. Tokenized treasuries and ETFs after that. One account, every asset.',
  },
];

export const RoadmapBento: React.FC = () => (
  <PageSection>
    <SectionHeader
      eyebrow="What we're building right now"
      title="The next 90 days."
      subtitle="A snapshot of the work in motion. Specifics may shift, but the direction stays."
    />

    {/* Bento grid */}
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(6, 1fr)' },
        gridAutoRows: 'minmax(220px, auto)',
        gap: 2,
      }}
    >
      {/* Big card */}
      <Box
        sx={{
          ...BLOCK_SX,
          gridColumn: { xs: '1', md: '1 / -1' },
        }}
      >
        <Eyebrow sx={{ mb: 1 }}>In progress · #1</Eyebrow>
        <Typography
          component="h3"
          sx={{
            fontSize: { xs: '22px', md: '28px' },
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: '#0A0A0F',
            mb: '10px',
            maxWidth: '700px',
          }}
        >
          A USDC savings account that <GradientText>pays real yield</GradientText>, automatically.
        </Typography>
        <Typography
          sx={{
            fontSize: '15px',
            color: '#6B6B76',
            lineHeight: 1.55,
            maxWidth: '600px',
            mb: '28px',
          }}
        >
          Auto-compounded into audited Stellar lending pools. No active management, no claiming, no
          gas. Open and earn in under 60 seconds.
        </Typography>

        {/* Stats */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            gap: '28px',
            pt: '24px',
            borderTop: HAIRLINE,
            flexWrap: 'wrap',
          }}
        >
          {[
            { value: '8.09%', label: 'Current APY' },
            { value: '$24M+', label: 'Deposits' },
            { value: '0', label: 'Lockups' },
          ].map((stat, i, arr) => (
            <Box key={stat.label} sx={{ display: 'flex', alignItems: 'stretch', gap: '28px' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Typography
                  sx={{
                    fontSize: '28px',
                    fontWeight: 400,
                    color: '#0A0A0F',
                    letterSpacing: '-0.02em',
                    fontFamily: MONO_FONT,
                  }}
                >
                  {stat.value}
                </Typography>
                <Eyebrow>{stat.label}</Eyebrow>
              </Box>
              {i < arr.length - 1 && (
                <Box sx={{ width: '1px', bgcolor: 'rgba(10,10,15,0.08)', flexShrink: 0 }} />
              )}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Small cards */}
      {SMALL_CARDS.map((card) => (
        <Box
          key={card.eyebrow}
          sx={{
            ...BLOCK_SX,
            gridColumn: { xs: '1', md: 'span 2' },
          }}
        >
          <Eyebrow sx={{ mb: 1 }}>{card.eyebrow}</Eyebrow>
          <Typography
            component="h3"
            sx={{
              fontSize: '22px',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: '#0A0A0F',
              mb: '10px',
            }}
          >
            {card.title}
          </Typography>
          <Typography sx={{ fontSize: '14px', color: '#6B6B76', lineHeight: 1.55 }}>
            {card.description}
          </Typography>
        </Box>
      ))}

      {/* Promise card (dark) */}
      <Box
        sx={{
          gridColumn: { xs: '1', md: '1 / -1' },
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#0A0A0F',
          border: HAIRLINE_ON_DARK,
          borderRadius: 'var(--radius-lg)',
          p: { xs: '20px', md: '24px' },
          isolation: 'isolate',
        }}
      >
        <BandBackdrop dots={false} />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Eyebrow tone="dark" sx={{ mb: 1 }}>
            Our promise
          </Eyebrow>
          <Typography
            component="h3"
            sx={{
              fontSize: { xs: '22px', md: '26px' },
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: '#fff',
              mb: '10px',
            }}
          >
            Transparency. Safety. Long term.
          </Typography>
          <Typography
            sx={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.55,
              maxWidth: '560px',
              mb: '16px',
            }}
          >
            We default to transparency, prioritize your safety, and build for the long term — not
            the hype cycle. Help shape what Normal becomes next.
          </Typography>
          <BrandButton tone="dark" emphasis="secondary" href="/contact">
            Share your feedback →
          </BrandButton>
        </Box>
      </Box>
    </Box>
  </PageSection>
);

export default RoadmapBento;

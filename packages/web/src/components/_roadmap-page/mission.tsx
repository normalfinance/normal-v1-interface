'use client';

import React from 'react';

import { Box, Typography } from '@mui/material';

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
  <Box
    component="section"
    sx={{ bgcolor: '#FAFAFB', pt: { xs: '80px', md: '110px' }, pb: { xs: '40px', md: '56px' } }}
  >
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
      {/* Header */}
      <Box sx={{ mb: '40px' }}>
        <Typography
          sx={{
            fontSize: '11px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#6B6B76',
            mb: 1.5,
          }}
        >
          — How we build
        </Typography>
        <Typography
          component="h2"
          sx={{
            fontWeight: 500,
            fontSize: 'clamp(32px, 4vw, 50px)',
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: '#0A0A0F',
            mb: '16px',
          }}
        >
          Four principles, no shortcuts.
        </Typography>
        <Typography
          sx={{
            fontSize: '16px',
            color: '#6B6B76',
            lineHeight: 1.55,
            maxWidth: '520px',
          }}
        >
          They guide every milestone on this page, and every line of code we ship.
        </Typography>
      </Box>

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
              borderTop: '1px solid rgba(10,10,15,0.08)',
              '&:last-child': { borderBottom: '1px solid rgba(10,10,15,0.08)' },
              transition: 'background 150ms ease',
              mx: '-24px',
              px: '24px',
              '&:hover': { bgcolor: 'rgba(10,10,15,0.015)' },
            }}
          >
            <Typography
              sx={{
                fontSize: '22px',
                fontWeight: 500,
                color: '#9A9AA3',
                letterSpacing: '-0.02em',
                fontFamily: '"Geist Mono", "Courier New", monospace',
                pt: { xs: 0, md: '2px' },
              }}
            >
              {item.n}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '17px', md: '22px' },
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: '#0A0A0F',
              }}
            >
              {item.title}
            </Typography>
            <Typography
              sx={{
                fontSize: '14.5px',
                color: '#6B6B76',
                lineHeight: 1.6,
                gridColumn: { xs: '2', md: 'auto' },
              }}
            >
              {item.description}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  </Box>
);

export default MissionSection;

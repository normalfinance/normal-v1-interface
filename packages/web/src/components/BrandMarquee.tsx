'use client';

import { Fragment } from 'react';

import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

const SEPARATOR = '★';

const BRANDS = [
  'Stellar',
  'USDC',
  'Halborn',
  'DeFindex',
  'Blend',
  'Coinbase',
  'MoonPay',
  'Visa',
] as const;

const MarqueeWrapper = styled('div')({
  overflow: 'hidden',
  position: 'relative',
  '&::before, &::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    pointerEvents: 'none',
    zIndex: 2,
  },
  '&::before': {
    left: 0,
    background: 'linear-gradient(90deg, rgb(234,250,254), transparent)',
  },
  '&::after': {
    right: 0,
    background: 'linear-gradient(-90deg, rgb(245,240,255), transparent)',
  },
  '&:hover .marquee-row': {
    animationPlayState: 'paused',
  },
  '@media (prefers-reduced-motion: reduce)': {
    '& .marquee-row': {
      animationPlayState: 'paused',
    },
  },
});

const MarqueeTrack = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(4),
  width: 'max-content',
  willChange: 'transform',
  animation: 'marquee-scroll 40s linear infinite',
  '@keyframes marquee-scroll': {
    from: { transform: 'translateX(0)' },
    to: { transform: 'translateX(-25%)' },
  },
}));

const REPETITIONS = 4;

export default function BrandMarquee() {
  const allBrands = Array(REPETITIONS).fill([...BRANDS]).flat() as string[];

  return (
    <Box
      component="section"
      aria-label="Backed by and partnered with"
      sx={(theme) => ({
        background: 'linear-gradient(180deg, rgb(234,250,254) 0%, rgb(245,240,255) 100%)',
        borderTop: `1px solid ${theme.palette.divider}`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        py: 3,
      })}
    >
      <MarqueeWrapper>
        <MarqueeTrack className="marquee-row">
          {allBrands.map((brand, i) => (
            <Fragment key={`${brand}-${i}`}>
              <Box
                component="span"
                sx={{
                  fontFamily: 'Satoshi, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  letterSpacing: '-0.01em',
                  color: '#8a8a93',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'color 200ms',
                  '&:hover': { color: '#0a0a0b' },
                }}
              >
                {brand}
              </Box>
              <Box
                component="span"
                aria-hidden="true"
                sx={{ color: '#d0d0d8', flexShrink: 0, fontSize: '0.75rem', userSelect: 'none' }}
              >
                {SEPARATOR}
              </Box>
            </Fragment>
          ))}
        </MarqueeTrack>
      </MarqueeWrapper>
    </Box>
  );
}

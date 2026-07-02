'use client';

import React from 'react';

import { Box, Typography } from '@mui/material';

const GRADIENT =
  'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)';

const META = [
  { label: 'Shipped', value: '7' },
  { label: 'In progress', value: '3' },
  { label: 'Planned', value: '5' },
  { label: 'Next ship', value: 'August 2026' },
];

export const RoadmapHero: React.FC = () => (
  <Box
    component="section"
    sx={{
      position: 'relative',
      overflow: 'hidden',
      bgcolor: '#0A0A0F',
      pt: { xs: '80px', md: '110px' },
      pb: { xs: '64px', md: '96px' },
      color: '#fff',
    }}
  >
    {/* Multi-colour glow */}
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: '-10%',
        background: `
          radial-gradient(closest-side at 18% 30%, rgba(91,207,255,0.30), transparent 60%),
          radial-gradient(closest-side at 82% 70%, rgba(255,176,96,0.22), transparent 60%),
          radial-gradient(closest-side at 60% 20%, rgba(255,123,197,0.22), transparent 60%),
          radial-gradient(closest-side at 35% 80%, rgba(177,123,255,0.28), transparent 60%)
        `,
        filter: 'blur(40px)',
        opacity: 0.9,
        pointerEvents: 'none',
      }}
    />
    {/* Grid overlay */}
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        WebkitMaskImage:
          'radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 80%)',
        maskImage:
          'radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 80%)',
        pointerEvents: 'none',
      }}
    />

    {/* Content */}
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, position: 'relative', zIndex: 1 }}>
      {/* Live pill */}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          px: '14px',
          py: '6px',
          borderRadius: '100px',
          bgcolor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.85)',
          mb: '22px',
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#1AB37D',
            boxShadow: '0 0 0 3px rgba(26,179,125,0.2)',
          }}
        />
        Roadmap · updated weekly
      </Box>

      <Typography
        component="h1"
        sx={{
          fontWeight: 500,
          fontSize: { xs: '3rem', sm: '4.5rem', md: '6rem', lg: '7rem' },
          lineHeight: 1.0,
          letterSpacing: '-0.04em',
          mb: '22px',
          color: '#fff',
        }}
      >
        Where we&apos;re headed{' '}
        <Box
          component="span"
          sx={{
            background: GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'inline-block',
            pb: '0.08em',
          }}
        >
          next.
        </Box>
      </Typography>

      <Typography
        sx={{
          fontSize: '17px',
          color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.55,
          maxWidth: '540px',
          mb: '48px',
        }}
      >
        Most people earn next to nothing on their savings. Normal is built to change that —
        starting with a USDC savings account that pays real yield, with no bank in the middle.
      </Typography>

      {/* Meta row */}
      <Box
        sx={{
          pt: '30px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: '28px',
        }}
      >
        {META.map((item) => (
          <Box key={item.label} sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Box
              sx={{
                fontSize: '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 500,
              }}
            >
              {item.label}
            </Box>
            <Box
              sx={{
                fontSize: '22px',
                fontWeight: 500,
                color: '#fff',
                fontFamily: '"Geist Mono", "Courier New", monospace',
                letterSpacing: '-0.02em',
              }}
            >
              {item.value}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  </Box>
);

export default RoadmapHero;

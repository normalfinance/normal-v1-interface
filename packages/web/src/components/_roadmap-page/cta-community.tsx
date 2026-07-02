'use client';

import React from 'react';
import { paths } from '@/routes/paths';

import { Box, Typography } from '@mui/material';

const GRADIENT =
  'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)';

export const CtaCommunity: React.FC = () => (
  <Box
    component="section"
    sx={{
      position: 'relative',
      overflow: 'hidden',
      bgcolor: '#0A0A0F',
      pt: { xs: '80px', md: '110px' },
      pb: { xs: '80px', md: '120px' },
      textAlign: 'center',
      isolation: 'isolate',
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

    <Box
      sx={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Pill */}
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
          mb: '18px',
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
        Join the community
      </Box>

      <Typography
        component="h2"
        sx={{
          fontWeight: 500,
          fontSize: { xs: '2.75rem', sm: '3.5rem', md: 'clamp(44px, 6vw, 80px)' },
          lineHeight: 1.04,
          letterSpacing: '-0.04em',
          color: '#fff',
          mx: 'auto',
          mt: 0,
          mb: 0,
        }}
      >
        Help us achieve{' '}
        <Box
          component="span"
          sx={{
            background: GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          our mission.
        </Box>
      </Typography>

      <Typography
        sx={{
          fontSize: '16px',
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.6,
          maxWidth: '540px',
          mt: '18px',
        }}
      >
        Every milestone on this page is shaped by feedback from real users. Tell us what to build
        next.
      </Typography>

      <Box
        sx={{
          display: 'flex',
          gap: '10px',
          mt: '30px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <Box
          component="a"
          href={paths.socials.twitter}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            px: '20px',
            py: '11px',
            borderRadius: '100px',
            bgcolor: '#FFFFFF',
            color: '#0A0A0F',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'opacity 150ms ease',
            '&:hover': { opacity: 0.9 },
          }}
        >
          Follow us on X →
        </Box>
        <Box
          component="a"
          href={paths.socials.discord}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            px: '20px',
            py: '11px',
            borderRadius: '100px',
            bgcolor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.16)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'all 150ms ease',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.24)' },
          }}
        >
          Join our Discord
        </Box>
      </Box>
    </Box>
  </Box>
);

CtaCommunity.displayName = 'CtaCommunity';
export default CtaCommunity;

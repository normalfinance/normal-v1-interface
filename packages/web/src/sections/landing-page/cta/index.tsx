'use client';

import * as React from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CtaImageProps = React.ComponentPropsWithoutRef<'section'>;

/* ------------------------------------------------------------------ */
/*  Styled                                                             */
/* ------------------------------------------------------------------ */

const SectionRoot = styled('section')({
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#eee8f7',
  borderTop: '1px solid #e8e8ec',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.4), transparent 60%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
});

const BlobWrapper = styled('div')({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
  zIndex: 0,
});

const Blob1 = styled('div')({
  position: 'absolute',
  borderRadius: '50%',
  filter: 'blur(90px)',
  willChange: 'transform',
  width: 560,
  height: 560,
  top: '10%',
  left: '-8%',
  background: 'radial-gradient(closest-side, #2bd2ff, transparent 70%)',
  opacity: 0.32,
  '@keyframes cta-float1': {
    '0%, 100%': { transform: 'translate(0, 0)' },
    '50%': { transform: 'translate(40px, -30px)' },
  },
  animation: 'cta-float1 20s ease-in-out infinite',
  '@media (prefers-reduced-motion: reduce)': { animationPlayState: 'paused' },
});

const Blob2 = styled('div')({
  position: 'absolute',
  borderRadius: '50%',
  filter: 'blur(90px)',
  willChange: 'transform',
  width: 520,
  height: 520,
  top: '5%',
  right: '-6%',
  background: 'radial-gradient(closest-side, #b561ff, transparent 70%)',
  opacity: 0.28,
  '@keyframes cta-float2': {
    '0%, 100%': { transform: 'translate(0, 0)' },
    '50%': { transform: 'translate(-30px, 40px)' },
  },
  animation: 'cta-float2 24s ease-in-out infinite',
  '@media (prefers-reduced-motion: reduce)': { animationPlayState: 'paused' },
});

const Blob3 = styled('div')({
  position: 'absolute',
  borderRadius: '50%',
  filter: 'blur(90px)',
  willChange: 'transform',
  width: 460,
  height: 460,
  bottom: '-15%',
  left: '30%',
  background: 'radial-gradient(closest-side, #ff5cb1, transparent 70%)',
  opacity: 0.26,
  '@keyframes cta-float3': {
    '0%, 100%': { transform: 'translate(0, 0)' },
    '50%': { transform: 'translate(20px, -40px)' },
  },
  animation: 'cta-float3 26s ease-in-out infinite',
  '@media (prefers-reduced-motion: reduce)': { animationPlayState: 'paused' },
});

const EyebrowPill = styled('div')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 14px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.8)',
  fontSize: 12.5,
  color: '#3a3a44',
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const CtaImage: React.FC<CtaImageProps> = (sectionProps) => {
  const { t } = useTranslate();

  return (
    <SectionRoot aria-labelledby="cta-heading" {...sectionProps}>
      {/* Animated blobs */}
      <BlobWrapper aria-hidden="true">
        <Blob1 />
        <Blob2 />
        <Blob3 />
      </BlobWrapper>

      {/* Padding wrapper */}
      <Box
        sx={{
          pt: { xs: '100px', md: '160px' },
          pb: { xs: '120px', md: '200px' },
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Inner content */}
        <Box sx={{ maxWidth: 880, mx: 'auto', px: 3, position: 'relative', zIndex: 1 }}>

          {/* Heading */}
          <Box
            component="h2"
            id="cta-heading"
            sx={{
              m: 0,
              fontSize: 'clamp(48px, 7vw, 96px)',
              fontWeight: 600,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: '#0a0a0b',
            }}
          >
            {t('Make crypto')}{' '}
            <Box
              component="span"
              sx={{
                fontStyle: 'italic',
                fontWeight: 400,
                background:
                  'linear-gradient(90deg, #2bd2ff 0%, #b561ff 40%, #ff5cb1 70%, #ffb347 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('normal.')}
            </Box>
          </Box>

          {/* Subhead */}
          <Box
            component="p"
            sx={{
              m: 0,
              mt: '28px',
              fontSize: 19,
              color: '#6b6b76',
              maxWidth: '56ch',
              mx: 'auto',
              lineHeight: 1.55,
            }}
          >
            {t(
              'Join thousands earning yield, sending money globally, and keeping full custody of their funds.'
            )}
          </Box>

          {/* CTA button */}
          <Box sx={{ mt: '40px' }}>
            <Box
              component="a"
              href={paths.savings}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 52,
                px: '32px',
                borderRadius: '999px',
                bgcolor: '#0a0a0b',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 8px 20px -10px rgba(15,15,25,0.4)',
                transition: 'background 150ms, transform 150ms',
                '&:hover': { bgcolor: '#1a1a20', transform: 'translateY(-1px)' },
              }}
            >
              {t('Start saving')}
            </Box>
          </Box>
        </Box>
      </Box>
    </SectionRoot>
  );
};

CtaImage.displayName = 'CtaImage';

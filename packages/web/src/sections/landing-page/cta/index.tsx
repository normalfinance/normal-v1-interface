'use client';

import * as React from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useVaultApy } from '@/hooks/use-vault-apy';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CtaImageProps = React.ComponentPropsWithoutRef<'section'>;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const CtaImage: React.FC<CtaImageProps> = (sectionProps) => {
  const { t } = useTranslate();
  const apy = useVaultApy();

  return (
    <Box
      component="section"
      aria-labelledby="cta-heading"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        background: '#0A0A0F',
        pt: { xs: '80px', md: '110px' },
        pb: { xs: '80px', md: '120px' },
        textAlign: 'center',
      }}
      {...sectionProps}
    >
      {/* Multi-color radial glow */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: '-10%',
          zIndex: 0,
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

      {/* Dot grid (same as dark bento card) */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 880,
          mx: 'auto',
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Live pill */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            px: '14px',
            py: '6px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '13px',
            fontWeight: 500,
            mb: '18px',
          }}
        >
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#1AB37D',
              boxShadow: '0 0 0 3px rgba(26,179,125,0.2)',
              flexShrink: 0,
              '@keyframes pulseDot': {
                '0%, 100%': { boxShadow: '0 0 0 3px rgba(26,179,125,0.18)' },
                '50%': { boxShadow: '0 0 0 5px rgba(26,179,125,0.08)' },
              },
              animation: 'pulseDot 2.4s ease-in-out infinite',
            }}
          />
          {apy == null ? (
            <Skeleton
              variant="text"
              width={90}
              sx={{
                bgcolor: 'rgba(255,255,255,0.12)',
                display: 'inline-block',
                verticalAlign: 'middle',
              }}
            />
          ) : (
            `${Number(apy).toFixed(2)}% APY · live now`
          )}
        </Box>

        {/* Heading */}
        <Box
          component="h2"
          id="cta-heading"
          sx={{
            m: 0,
            fontSize: 'clamp(44px, 6vw, 80px)',
            fontWeight: 500,
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            color: '#fff',
          }}
        >
          {t('Make crypto')}{' '}
          <Box
            component="span"
            sx={{
              background:
                'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)',
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
            mt: '18px',
            fontSize: '16px',
            color: 'rgba(255,255,255,0.65)',
            maxWidth: 520,
            mx: 'auto',
            lineHeight: 1.55,
          }}
        >
          {t(
            'Join thousands investing in crypto, earning yield, and keeping full custody of their funds.'
          )}
        </Box>

        {/* Buttons */}
        <Box
          sx={{
            mt: '30px',
            display: 'inline-flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Box
            component="a"
            href={paths.savings}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 48,
              px: '24px',
              borderRadius: '999px',
              bgcolor: '#fff',
              color: '#0A0A0F',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 150ms, transform 150ms',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)', transform: 'translateY(-1px)' },
            }}
          >
            {t('Start saving →')}
          </Box>
          <Box
            component="a"
            href="https://normalfi.substack.com/p/making-crypto-normal-simple-safe"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 48,
              px: '24px',
              borderRadius: '999px',
              bgcolor: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.16)',
              transition: 'background 150ms, border-color 150ms, transform 150ms',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.14)',
                borderColor: 'rgba(255,255,255,0.24)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            {t('Read whitepaper')}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

CtaImage.displayName = 'CtaImage';

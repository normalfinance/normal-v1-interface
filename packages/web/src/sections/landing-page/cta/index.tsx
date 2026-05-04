'use client';

import * as React from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CtaButton = { label: string; href: string };

export type CtaImageProps = React.ComponentPropsWithoutRef<'section'> & {
  eyebrow?: string;
  heading?: string;
  subhead?: string;
  primaryCta?: CtaButton;
  secondaryCta?: CtaButton;
};

/* ------------------------------------------------------------------ */
/*  Styled                                                             */
/* ------------------------------------------------------------------ */

const Card = styled('div')({
  position: 'relative',
  overflow: 'hidden',
  maxWidth: 1100,
  margin: '0 auto',
  backgroundColor: '#fff',
  border: '1px solid #e8e8ec',
  borderRadius: 28,
  textAlign: 'center',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -100,
    left: -100,
    width: 380,
    height: 380,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(43,210,255,0.20) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 380,
    height: 380,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(181,97,255,0.20) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const CtaImage: React.FC<CtaImageProps> = ({
  eyebrow = '— Get started',
  heading = 'Ready to make your money work harder?',
  subhead = 'Join thousands of users earning yield on their savings. No bank required.',
  primaryCta = { label: 'Start earning', href: paths.invest },
  secondaryCta = { label: 'Learn more', href: paths.about },
  ...sectionProps
}) => {
  const { t } = useTranslate();

  return (
    <Box
      component="section"
      sx={{ bgcolor: '#fafafa', py: 12 }}
      {...sectionProps}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        <Card sx={{ padding: { xs: '48px 28px', md: '64px 48px' } }}>
          {/* centered pink glow */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 500,
              height: 220,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,92,177,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* content */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box
              component="p"
              sx={{
                m: 0,
                mb: '14px',
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#6b6b76',
              }}
            >
              {t(eyebrow)}
            </Box>

            <Box
              component="h2"
              sx={{
                m: 0,
                fontSize: 'clamp(34px, 4.4vw, 56px)',
                fontWeight: 600,
                letterSpacing: '-0.03em',
                lineHeight: 1.04,
                color: '#0a0a0b',
                maxWidth: '20ch',
                mx: 'auto',
              }}
            >
              {t(heading)}
            </Box>

            <Box
              component="p"
              sx={{
                m: 0,
                mt: '14px',
                fontSize: 17,
                color: '#6b6b76',
                maxWidth: '56ch',
                mx: 'auto',
                lineHeight: 1.5,
              }}
            >
              {t(subhead)}
            </Box>

            <Box
              sx={{
                mt: 5,
                display: 'flex',
                gap: 2,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Button
                component="a"
                href={primaryCta.href}
                sx={{
                  height: 48,
                  px: '28px',
                  borderRadius: '999px',
                  bgcolor: '#0a0a0b',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '15px',
                  textTransform: 'none',
                  transition: 'background 150ms, transform 150ms',
                  '&:hover': {
                    bgcolor: '#2a2a30',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                {t(primaryCta.label)}
              </Button>

              <Button
                component="a"
                href={secondaryCta.href}
                sx={{
                  height: 48,
                  px: '28px',
                  borderRadius: '999px',
                  bgcolor: 'transparent',
                  color: '#0a0a0b',
                  fontWeight: 600,
                  fontSize: '15px',
                  textTransform: 'none',
                  border: '1px solid #d0d0d8',
                  transition: 'border-color 150ms, background 150ms, transform 150ms',
                  '&:hover': {
                    bgcolor: 'rgba(10,10,11,0.04)',
                    borderColor: '#0a0a0b',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                {t(secondaryCta.label)}
              </Button>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

CtaImage.displayName = 'CtaImage';

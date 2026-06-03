'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { useRouter } from 'next/navigation';

import { Box, Link, Stack, Button, Typography } from '@mui/material';

type LogoItem = {
  name: string;
  src: string;
  width: number;
  height: number;
  href?: string;
};

const DEFAULT_LOGOS: LogoItem[] = [
  {
    name: 'Stellar',
    src: cdn('homepage/stellar-logo.webp'),
    width: 82,
    height: 20,
    href: 'https://stellar.org/',
  },
  {
    name: 'Draper University',
    src: cdn('homepage/draper-university.webp'),
    width: 62,
    height: 20,
    href: 'https://draperuniversity.com/',
  },
  {
    name: 'Draper University Ventures',
    src: cdn('homepage/draper-university-ventures.webp'),
    width: 62,
    height: 20,
    href: 'https://draperuniversity.com/ventures',
  },
  {
    name: 'Blend Capital',
    src: cdn('homepage/blend-capital.png'),
    width: 62,
    height: 20,
    href: 'https://blend.capital/',
  },
  {
    name: 'DeFindex',
    src: cdn('homepage/defiindex.png'),
    width: 78,
    height: 20,
    href: 'https://www.defindex.io/',
  },
  {
    name: 'Halborn',
    src: cdn('homepage/halborn-logo.webp'),
    width: 113,
    height: 13,
    href: 'https://www.halborn.com/',
  },
];

const META = [
  { label: 'Founded', value: '2022' },
  { label: 'HQ', value: 'Chicago' },
];

const TEAM_AVATARS = [
  cdn('about-page/justin.webp'),
  cdn('about-page/niko.webp'),
  cdn('about-page/avm.webp'),
  cdn('about-page/jake.webp'),
  cdn('about-page/jay.webp'),
  cdn('about-page/anth.webp'),
  cdn('about-page/john.webp'),
  cdn('about-page/zeal.webp'),
];

const GRADIENT =
  'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)';

export const AboutHeader: React.FC = () => {
  const { t } = useTranslate();
  const router = useRouter();

  return (
    <>
      {/* ── Hero ── */}
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
        {/* Dot grid */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
            maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
            pointerEvents: 'none',
          }}
        />
        {/* Ambient glow */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: '-20%',
            background: `
              radial-gradient(closest-side at 20% 60%, rgba(91,207,255,0.15), transparent 60%),
              radial-gradient(closest-side at 80% 40%, rgba(177,123,255,0.15), transparent 60%)
            `,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            px: 3,
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: '40px', md: '80px' },
            alignItems: 'center',
          }}
        >
              {/* Left: text */}
              <Box>
                {/* Tagline pill — matches landing page "8% APY • live now" style */}
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    px: '16px',
                    py: '8px',
                    borderRadius: '100px',
                    bgcolor: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.75)',
                    mb: '28px',
                  }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: '#4ADE80',
                      flexShrink: 0,
                      boxShadow: '0 0 0 2px rgba(74,222,128,0.3)',
                    }}
                  />
                  About Normal
                </Box>

                <Typography
                  component="h1"
                  sx={{
                    fontWeight: 500,
                    fontSize: { xs: '2.5rem', sm: '3.25rem', md: '3.75rem', lg: '4.25rem' },
                    lineHeight: 1.05,
                    letterSpacing: '-0.03em',
                    mb: '24px',
                    color: '#FFFFFF',
                  }}
                >
                  Making Crypto{' '}
                  <Box
                    component="span"
                    sx={{
                      background: GRADIENT,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Feel Normal
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1.75,
                    mb: '36px',
                    maxWidth: '480px',
                  }}
                >
                  {t(
                    "At Normal, our mission is to make crypto normal — starting with a savings account that pays real yield, works for everyone, and puts you in full control of your money."
                  )}
                </Typography>

                <Stack direction="row" gap="12px" flexWrap="wrap">
                  <Button
                    variant="contained"
                    onClick={() => router.push('/savings')}
                    sx={{
                      bgcolor: '#FFFFFF',
                      color: '#0A0A0F',
                      borderRadius: '100px',
                      px: '28px',
                      py: '12px',
                      fontWeight: 700,
                      fontSize: '15px',
                      textTransform: 'none',
                      boxShadow: 'none',
                      letterSpacing: '-0.01em',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)', boxShadow: 'none' },
                    }}
                  >
                    Start saving →
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => router.push('/roadmap')}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      borderRadius: '100px',
                      px: '28px',
                      py: '12px',
                      fontWeight: 700,
                      fontSize: '15px',
                      textTransform: 'none',
                      boxShadow: 'none',
                      letterSpacing: '-0.01em',
                      border: '1px solid rgba(255,255,255,0.12)',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.15)',
                        boxShadow: 'none',
                      },
                    }}
                  >
                    Roadmap
                  </Button>
                </Stack>

                {/* Meta row */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: { xs: '24px', sm: '36px' },
                    mt: '44px',
                    pt: '28px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                  }}
                >
                  {META.map((item) => (
                    <Box key={item.label}>
                      <Box
                        sx={{
                          fontSize: '10px',
                          color: 'rgba(255,255,255,0.3)',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          mb: '5px',
                        }}
                      >
                        {item.label}
                      </Box>
                      <Box
                        sx={{
                          fontSize: '24px',
                          fontWeight: 400,
                          color: '#FFFFFF',
                          letterSpacing: '-0.02em',
                          fontFamily: '"Geist Mono", "Courier New", monospace',
                        }}
                      >
                        {item.value}
                      </Box>
                    </Box>
                  ))}

                  {/* Team avatars */}
                  <Box>
                    <Box
                      sx={{
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        mb: '5px',
                      }}
                    >
                      Team
                    </Box>
                    <Box sx={{ display: 'flex' }}>
                      {TEAM_AVATARS.map((src, i) => (
                        <Box
                          key={i}
                          component="img"
                          src={src}
                          alt={`Team member ${i + 1}`}
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            objectPosition: 'top',
                            border: '2px solid rgba(255,255,255,0.15)',
                            ml: i === 0 ? 0 : '-12px',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Right: image + floating stat */}
              <Box sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src={cdn('about-page/meridian.webp')}
                  alt="Normal team at Meridian"
                  sx={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    objectFit: 'cover',
                    borderRadius: '18px',
                    display: 'block',
                  }}
                />

                {/* Floating stat card */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: { xs: '-16px', md: '-24px' },
                    left: { xs: '-12px', md: '-24px' },
                    bgcolor: 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '16px',
                    px: '20px',
                    py: '14px',
                    minWidth: '140px',
                  }}
                >
                  <Box
                    sx={{
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      mb: '5px',
                    }}
                  >
                    Total Value Locked
                  </Box>
                  <Box
                    sx={{
                      fontSize: '22px',
                      fontWeight: 400,
                      color: '#FFFFFF',
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                      fontFamily: '"Geist Mono", "Courier New", monospace',
                    }}
                  >
                    $1,428,629
                  </Box>
                </Box>
              </Box>
        </Box>
      </Box>

      {/* ── TrustedBy ── */}
      <Box
        component="section"
        sx={{ bgcolor: '#FAFAFB', py: { xs: '40px', md: '56px' } }}
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
              — Backed &amp; Built With
            </Typography>
            <Typography
              component="h2"
              sx={{
                fontSize: 'clamp(32px, 4vw, 52px)',
                fontWeight: 500,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                color: '#0A0A0F',
                mb: 1.5,
              }}
            >
              Trusted by the best
            </Typography>
            <Typography
              sx={{
                fontSize: '16px',
                color: '#6B6B76',
                lineHeight: 1.55,
                maxWidth: '520px',
              }}
            >
              Infrastructure, security, and capital partners that share our conviction in open finance.
            </Typography>
          </Box>

          {/* Grid card */}
          <Box
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid rgba(10,10,15,0.08)',
              borderRadius: '20px',
              boxShadow:
                '0 1px 0 rgba(255,255,255,0.9) inset, 0 10px 32px rgba(10,10,15,0.07), 0 2px 6px rgba(10,10,15,0.04)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
            }}
          >
            {DEFAULT_LOGOS.map((logo, i) => (
              <Stack
                key={logo.name}
                component={logo.href ? Link : 'div'}
                {...(logo.href
                  ? { href: logo.href, target: '_blank', rel: 'noreferrer noopener' }
                  : {})}
                alignItems="center"
                justifyContent="center"
                spacing={{ xs: '8px', md: '12px' }}
                sx={{
                  px: { xs: '16px', sm: '28px', md: '40px' },
                  py: { xs: '24px', md: '36px' },
                  textDecoration: 'none',
                  transition: 'background 150ms ease',
                  '&:hover': { bgcolor: 'rgba(10,10,15,0.03)', textDecoration: 'none' },
                  borderRight: {
                    xs: i % 2 === 0 ? '1px solid rgba(10,10,15,0.06)' : 'none',
                    sm: i % 3 !== 2 ? '1px solid rgba(10,10,15,0.06)' : 'none',
                  },
                  borderBottom: {
                    xs: i < 4 ? '1px solid rgba(10,10,15,0.06)' : 'none',
                    sm: i < 3 ? '1px solid rgba(10,10,15,0.06)' : 'none',
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: 9, md: 10 },
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#9A9AA3',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}
                >
                  {logo.name}
                </Typography>
                <Box
                  component="img"
                  src={logo.src}
                  alt={logo.name}
                  loading="lazy"
                  sx={{
                    width: 'auto',
                    height: { xs: logo.height * 1.1, md: logo.height * 1.8 },
                    maxWidth: { xs: '80px', md: '140px' },
                    objectFit: 'contain',
                    filter: 'brightness(0)',
                    opacity: 0.85,
                  }}
                />
              </Stack>
            ))}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default AboutHeader;

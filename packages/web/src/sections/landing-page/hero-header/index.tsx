'use client';

import * as React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { useTheme } from '@mui/material/styles';
import { Box, Stack, Container, Typography } from '@mui/material';

import SavingsCard from '@/components/_common/savings-card';

import { WavyBackground } from './wavy-background';

// ----------------------------------------------------------------------

export const HeroHeader: React.FC = () => {
  const { t } = useTranslate();
  const theme = useTheme();

  const trustItems = [
    {
      label: t('Audited by'),
      src: cdn('homepage/halborn-logo.webp'),
      alt: 'Halborn',
      width: 72,
      height: 8,
    },
    {
      label: t('Backed by'),
      src: cdn('homepage/draper-university.webp'),
      alt: 'Draper University',
      width: 56,
      height: 18,
    },
    {
      label: t('Backed by'),
      src: cdn('homepage/stellar-logo.webp'),
      alt: 'Stellar',
      width: 52,
      height: 13,
    },
  ];

  return (
    <Box
      component="section"
      sx={(t) => ({
        position: 'relative',
        overflow: 'hidden',
        px: '5%',
        py: { xs: 7, md: 9, lg: 11 },
        bgcolor: '#FAFAFB',
        ...t.applyStyles('dark', { bgcolor: 'background.paper' }),
      })}
    >
      {/* Wavy canvas */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <WavyBackground
          sizing="viewport"
          baseline="center"
          yOffset={0}
          colors={['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#22d3ee']}
          waveOpacity={0.35}
          blur={36}
          saturate={115}
          canvasOpacity={0.85}
          speed="slow"
          backgroundFill={theme.palette.mode === 'dark' ? theme.palette.background.paper : '#FAFAFB'}
        />
      </Box>

      {/* Fade top */}
      <Box
        sx={(t) => ({
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '90px',
          background: t.palette.mode === 'dark'
            ? `linear-gradient(to bottom, ${t.palette.background.paper} 0%, transparent 100%)`
            : 'linear-gradient(to bottom, rgba(250,250,251,1) 0%, rgba(250,250,251,0) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        })}
      />

      {/* Fade bottom */}
      <Box
        sx={(t) => ({
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '140px',
          background: t.palette.mode === 'dark'
            ? `linear-gradient(to top, ${t.palette.background.paper} 0%, transparent 100%)`
            : 'linear-gradient(to top, rgba(250,250,251,1) 0%, rgba(250,250,251,0) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        })}
      />

      {/* Content */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, px: 0 }}>
        <Stack alignItems="center">
          <Box sx={{ textAlign: 'center', width: '100%' }}>

            {/* ---- Hero pill ---- */}
            <Box
              sx={(t) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                px: '14px',
                py: '7px',
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(16px) saturate(160%)',
                border: '1px solid rgba(10,10,15,0.08)',
                borderRadius: '999px',
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.9) inset, 0 10px 32px rgba(10,10,15,0.07), 0 2px 6px rgba(10,10,15,0.04)',
                mb: '28px',
                ...t.applyStyles('dark', {
                  background: 'rgba(20,26,33,0.85)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 10px 32px rgba(0,0,0,0.2)',
                }),
              })}
            >
              <Typography
                sx={(t) => ({
                  fontSize: '13.5px',
                  fontWeight: 500,
                  color: '#6B6B76',
                  lineHeight: 1,
                  ...t.applyStyles('dark', { color: '#9A9AA3' }),
                })}
              >
                {t('Investing that works for you')}
              </Typography>
              <Box
                sx={(t) => ({
                  width: '1px',
                  height: '12px',
                  background: 'rgba(10,10,15,0.12)',
                  flexShrink: 0,
                  ...t.applyStyles('dark', { background: 'rgba(255,255,255,0.12)' }),
                })}
              />
              <Box
                component="img"
                src={cdn('homepage/normal-long.svg')}
                alt="Normal"
                sx={{ width: '64px', height: '14px', objectFit: 'contain' }}
              />
            </Box>

            {/* ---- Title ---- */}
            <Typography
              component="h1"
              sx={(t) => ({
                fontSize: 'clamp(40px, 5.6vw, 68px)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 1.08,
                mb: { xs: '32px', md: '40px' },
                color: '#0A0A0F',
                ...t.applyStyles('dark', { color: '#FFFFFF' }),
              })}
            >
              {t('Earn passive yield, and')}
              <br />
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
                {t('watch it grow')}
              </Box>
            </Typography>

            {/* ---- Savings card ---- */}
            <Box sx={{ maxWidth: 480, width: '100%', mx: 'auto', mb: '24px' }}>
              <SavingsCard />
            </Box>

            {/* ---- Trust pill ---- */}
            <Box
              sx={(t) => ({
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(10,10,15,0.07)',
                borderRadius: '999px',
                overflow: 'hidden',
                mb: '16px',
                ...t.applyStyles('dark', {
                  background: 'rgba(20,26,33,0.6)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }),
              })}
            >
              {trustItems.map((item, i) => (
                <React.Fragment key={i}>
                  <Stack alignItems="center" spacing="5px" sx={{ px: '18px', py: '10px' }}>
                    <Typography
                      sx={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#9A9AA3',
                        whiteSpace: 'nowrap',
                        lineHeight: 1,
                      }}
                    >
                      {item.label}
                    </Typography>
                    <Box
                      component="img"
                      src={item.src}
                      alt={item.alt}
                      sx={{
                        width: item.width,
                        height: item.height,
                        objectFit: 'contain',
                        filter:
                          theme.palette.mode === 'dark'
                            ? 'brightness(0) invert(1)'
                            : 'brightness(0)',
                        opacity: 0.55,
                      }}
                    />
                  </Stack>
                  {i < trustItems.length - 1 && (
                    <Box
                      sx={(t) => ({
                        width: '1px',
                        alignSelf: 'stretch',
                        background: 'rgba(10,10,15,0.07)',
                        ...t.applyStyles('dark', { background: 'rgba(255,255,255,0.07)' }),
                      })}
                    />
                  )}
                </React.Fragment>
              ))}
            </Box>

            {/* ---- Sub text ---- */}
            <Typography
              sx={(t) => ({
                fontSize: '14px',
                color: '#9A9AA3',
                letterSpacing: '-0.01em',
                lineHeight: 1.6,
                ...t.applyStyles('dark', { color: '#6B6B76' }),
              })}
            >
              {t('Self-custody savings. Live yield. Built on Stellar.')}
            </Typography>

          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

HeroHeader.displayName = 'HeroHeader';

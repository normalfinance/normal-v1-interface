'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { useRouter } from 'next/navigation';

import { Box, Link, Stack, Typography } from '@mui/material';

import {
  Eyebrow,
  LiveDot,
  HAIRLINE,
  HeroLede,
  MetaItem,
  HeroBadge,
  HeroTitle,
  MONO_FONT,
  BrandButton,
  PageSection,
  GradientText,
  SectionHeader,
  HAIRLINE_ON_DARK,
} from '@/components/_common/brand';

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

export const AboutHeader: React.FC = () => {
  const { t } = useTranslate();
  const router = useRouter();

  return (
    <>
      {/* ── Hero ── */}
      <PageSection tone="dark">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '1fr 1fr' },
            gap: { xs: 5, md: 10 },
            alignItems: 'center',
          }}
        >
          {/* Left: text */}
          <Box>
            <HeroBadge tone="dark">
              <LiveDot tone="dark" />
              About Normal
            </HeroBadge>

            <HeroTitle tone="dark">
              Making Crypto <GradientText>Feel Normal</GradientText>
            </HeroTitle>

            <HeroLede tone="dark">
              {t(
                'At Normal, our mission is to make crypto normal — starting with a savings account that pays real yield, works for everyone, and puts you in full control of your money.'
              )}
            </HeroLede>

            <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mt: 4 }}>
              <BrandButton tone="dark" onClick={() => router.push('/savings')}>
                Start saving →
              </BrandButton>
              <BrandButton tone="dark" emphasis="secondary" onClick={() => router.push('/roadmap')}>
                Roadmap
              </BrandButton>
            </Stack>

            {/* Meta row */}
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 3, sm: 5 },
                mt: 5,
                pt: 3,
                borderTop: HAIRLINE_ON_DARK,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
              }}
            >
              {META.map((item) => (
                <MetaItem key={item.label} tone="dark" label={item.label} value={item.value} />
              ))}

              {/* Team avatars */}
              <Box>
                <Eyebrow tone="dark" sx={{ mb: 0.75 }}>
                  Team
                </Eyebrow>
                <Box sx={{ display: 'flex' }}>
                  {TEAM_AVATARS.map((src, i) => (
                    <Box
                      key={i}
                      component="img"
                      src={src}
                      alt={`Team member ${i + 1}`}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        objectPosition: 'top',
                        border: '2px solid #0A0A0F',
                        ml: i === 0 ? 0 : '-10px',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Right: image + stat */}
          <Box sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={cdn('about-page/meridian.webp')}
              alt="Normal team at Meridian"
              sx={{
                width: '100%',
                aspectRatio: '16 / 9',
                objectFit: 'cover',
                borderRadius: 'var(--radius-lg)',
                display: 'block',
              }}
            />

            <Box
              sx={{
                position: 'absolute',
                left: { xs: '12px', md: '16px' },
                bottom: { xs: '12px', md: '16px' },
                bgcolor: 'rgba(10,10,15,0.72)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 'var(--radius-md)',
                px: '16px',
                py: '12px',
              }}
            >
              <Eyebrow tone="dark" sx={{ mb: 0.5 }}>
                Backed by
              </Eyebrow>
              <Box
                sx={{
                  fontSize: 18,
                  fontWeight: 400,
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  fontFamily: MONO_FONT,
                }}
              >
                Stellar · Draper
              </Box>
            </Box>
          </Box>
        </Box>
      </PageSection>

      {/* ── TrustedBy ── */}
      <PageSection>
        <SectionHeader
          eyebrow="Backed & Built With"
          title="Trusted by the best"
          subtitle="Infrastructure, security, and capital partners that share our conviction in open finance."
        />

        {/* Grid card */}
        <Box
          sx={{
            bgcolor: '#FFFFFF',
            border: HAIRLINE,
            borderRadius: 'var(--radius-lg)',
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
                  xs: i % 2 === 0 ? HAIRLINE : 'none',
                  sm: i % 3 !== 2 ? HAIRLINE : 'none',
                },
                borderBottom: {
                  xs: i < 4 ? HAIRLINE : 'none',
                  sm: i < 3 ? HAIRLINE : 'none',
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.16em',
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
      </PageSection>
    </>
  );
};

export default AboutHeader;

'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import { useRouter } from 'next/navigation';

import { Box, Link, Stack } from '@mui/material';

import {
  Eyebrow,
  LiveDot,
  HeroLede,
  MetaItem,
  HeroBadge,
  HeroTitle,
  BrandButton,
  PageSection,
  GradientText,
  HAIRLINE_ON_DARK,
} from '@/components/_common/brand';

type LogoItem = {
  name: string;
  src: string;
  height: number;
  href: string;
};

const DEFAULT_LOGOS: LogoItem[] = [
  {
    name: 'Stellar',
    src: cdn('homepage/stellar-logo.webp'),
    height: 20,
    href: 'https://stellar.org/',
  },
  {
    name: 'Draper University',
    src: cdn('homepage/draper-university.webp'),
    height: 20,
    href: 'https://draperuniversity.com/',
  },
  {
    name: 'Draper University Ventures',
    src: cdn('homepage/draper-university-ventures.webp'),
    height: 20,
    href: 'https://draperuniversity.com/ventures',
  },
  {
    name: 'Blend Capital',
    src: cdn('homepage/blend-capital.png'),
    height: 20,
    href: 'https://blend.capital/',
  },
  {
    name: 'DeFindex',
    src: cdn('homepage/defiindex.png'),
    height: 20,
    href: 'https://www.defindex.io/',
  },
  {
    name: 'Halborn',
    src: cdn('homepage/halborn-logo.webp'),
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
      <PageSection tone="dark" sx={{ pb: { xs: 4, md: 5 } }}>
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

          {/* Right: image */}
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
        </Box>

        {/* Backers: part of the hero, so the page moves straight into the story */}
        <Box
          sx={{
            mt: { xs: 5, md: 8 },
            pt: 3,
            borderTop: HAIRLINE_ON_DARK,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { md: 'center' },
            gap: { xs: 3, md: 6 },
          }}
        >
          <Eyebrow tone="dark" sx={{ flexShrink: 0 }}>
            Backed &amp; built with
          </Eyebrow>
          <Box
            sx={{
              flexGrow: 1,
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(6, auto)' },
              justifyContent: { md: 'space-between' },
              alignItems: 'center',
              gap: { xs: 3, md: 4 },
            }}
          >
            {DEFAULT_LOGOS.map((logo) => (
              <Link
                key={logo.name}
                href={logo.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={logo.name}
                sx={{
                  display: 'flex',
                  opacity: 0.7,
                  transition: 'opacity 150ms ease',
                  '&:hover': { opacity: 1 },
                }}
              >
                <Box
                  component="img"
                  src={logo.src}
                  alt={logo.name}
                  loading="lazy"
                  sx={{
                    width: 'auto',
                    height: logo.height * 1.3,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    filter: 'brightness(0) invert(1)',
                  }}
                />
              </Link>
            ))}
          </Box>
        </Box>
      </PageSection>
    </>
  );
};

export default AboutHeader;

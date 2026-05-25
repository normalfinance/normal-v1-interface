'use client';

import React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import { Box, Container, Typography } from '@mui/material';

type FeatureItem = {
  icon: { src: string; alt: string };
  heading: string;
  description: string;
};

type Props = {
  heading: string;
  features: FeatureItem[];
};

export type CoreValuesProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

export const CoreValuesDefaults: Props = {
  heading: 'Core Values',
  features: [
    {
      icon: { src: cdn('about-page/i1.svg'), alt: 'Icon 1' },
      heading: 'Keep Crypto Human',
      description: 'Remove complexity, speak plainly, and design for real people — not power users. Every screen, every error message, and every transaction should be explainable in a single sentence. If your parents can\'t use it, we\'re not done.',
    },
    {
      icon: { src: cdn('about-page/i2.svg'), alt: 'Icon 2' },
      heading: 'Security First',
      description: 'Audited contracts, battle-tested code, and 24/7 monitoring on every deployment. Halborn reviews every release before it touches mainnet. We treat your savings with the same seriousness you do — because cutting corners on security isn\'t a tradeoff, it\'s a failure.',
    },
    {
      icon: { src: cdn('about-page/i3.svg'), alt: 'Icon 3' },
      heading: 'Permissionless Innovation',
      description: 'Build composable primitives that anyone can extend, fork, or build on top of. Open SDK, public smart contracts, MIT-licensed components. We believe the best financial infrastructure is infrastructure no single company controls.',
    },
    {
      icon: { src: cdn('about-page/i4.svg'), alt: 'Icon 4' },
      heading: 'Community Ownership',
      description: 'NORM token holders create and vote on every proposal that shapes the protocol. No backroom decisions, no surprise upgrades. The roadmap belongs to the people using the product — we\'re here to build what the community decides.',
    },
    {
      icon: { src: cdn('about-page/i5.svg'), alt: 'Icon 5' },
      heading: 'Data > Hype',
      description: 'Let on-chain metrics guide every product decision. We don\'t ship features because they\'re trending — we ship them because usage data says users need them. Hype fades. Real yield, real volume, and real retention don\'t.',
    },
  ],
};

export const CoreValues: React.FC<CoreValuesProps> = (props) => {
  const { t } = useTranslate();

  const { heading, features, ...sectionProps } = {
    ...CoreValuesDefaults,
    ...props,
  };

  return (
    <Box
      component="section"
      {...sectionProps}
      id="core-values"
      sx={{ bgcolor: '#FAFAFB', py: { xs: '40px', md: '56px' } }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: { xs: '48px', md: '64px' }, maxWidth: '640px' }}>
          <Typography
            sx={{
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#6B6B76',
              mb: 1.5,
            }}
          >
            — Our Principles
          </Typography>
          <Typography
            component="h2"
            sx={{
              fontWeight: 500,
              fontSize: 'clamp(32px, 4vw, 52px)',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#0A0A0F',
              mb: '16px',
            }}
          >
            {t(heading)}
          </Typography>
          <Typography
            sx={{
              fontSize: '16px',
              color: '#6B6B76',
              lineHeight: 1.55,
            }}
          >
            {t(
              'Five guiding principles that keep us focused on making crypto transparent, secure, and genuinely useful.'
            )}
          </Typography>
        </Box>

        {/* Numbered editorial list */}
        <Box>
          {features.map((feature, i) => (
            <Box
              key={feature.heading}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '56px 1fr 1fr' },
                gap: { xs: '6px', sm: '40px' },
                alignItems: 'start',
                py: { xs: '24px', md: '32px' },
                borderTop: '1px solid rgba(10,10,15,0.07)',
                '&:last-child': { borderBottom: '1px solid rgba(10,10,15,0.07)' },
              }}
            >
              {/* Number */}
              <Box
                sx={{
                  fontFamily: '"Geist Mono", "Courier New", monospace',
                  fontSize: '18px',
                  fontWeight: 500,
                  color: 'rgba(10,10,15,0.25)',
                  letterSpacing: '0.06em',
                  pt: { xs: 0, sm: '5px' },
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </Box>

              {/* Heading */}
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '17px', md: '20px' },
                  color: '#0A0A0F',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.3,
                }}
              >
                {t(feature.heading)}
              </Typography>

              {/* Description */}
              <Typography
                sx={{
                  fontSize: '16px',
                  color: '#6B6B76',
                  lineHeight: 1.55,
                }}
              >
                {t(feature.description)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default CoreValues;

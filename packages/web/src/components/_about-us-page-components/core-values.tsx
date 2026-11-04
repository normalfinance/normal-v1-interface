'use client';

import React from 'react';
import { useTranslate } from '@/locales';

import { Box, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import {
  Eyebrow,
  LiveDot,
  BLOCK_SX,
  MONO_FONT,
  PageSection,
  BandBackdrop,
  GradientText,
  SectionHeader,
  BRAND_GRADIENT,
  HAIRLINE_ON_DARK,
} from '@/components/_common/brand';

// ----------------------------------------------------------------------

const CHIP_SX = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  minWidth: 0,
  px: '12px',
  py: '10px',
  fontFamily: MONO_FONT,
  fontSize: 13,
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
  color: '#0A0A0F',
  bgcolor: '#F4F4F7',
  borderRadius: 'var(--radius-md)',
} as const;

// Heights in percent. Illustrative shape only, not a real metric.
const BARS = [24, 32, 28, 40, 36, 50, 46, 60, 56, 72, 84, 100];

type ValueCardProps = {
  name: string;
  line: string;
  body: string;
  children: React.ReactNode;
};

function ValueCard({ name, line, body, children }: ValueCardProps) {
  const { t } = useTranslate();

  return (
    <Box
      sx={{
        ...BLOCK_SX,
        display: 'flex',
        flexDirection: 'column',
        gridColumn: { md: 'span 2' },
        transition: 'border-color 150ms ease',
        '&:hover': { borderColor: 'rgba(10,10,15,0.14)' },
      }}
    >
      <Eyebrow sx={{ mb: 1.5 }}>{t(name)}</Eyebrow>
      <Typography
        component="h3"
        sx={{
          fontSize: 22,
          fontWeight: 500,
          lineHeight: 1.22,
          letterSpacing: '-0.02em',
          color: '#0A0A0F',
        }}
      >
        {t(line)}
      </Typography>
      <Typography sx={{ mt: 1.5, mb: 3, fontSize: 14, lineHeight: 1.6, color: '#2A2A33' }}>
        {t(body)}
      </Typography>
      <Box sx={{ mt: 'auto' }}>{children}</Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

function HumanCard() {
  const { t } = useTranslate();

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        gridColumn: { sm: '1 / -1', md: 'span 4' },
        display: 'flex',
        bgcolor: '#0A0A0F',
        borderRadius: 'var(--radius-lg)',
        p: { xs: '24px', md: '32px' },
      }}
    >
      <BandBackdrop />

      <Box
        sx={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Eyebrow tone="dark" sx={{ mb: 2 }}>
          {t('Keep Crypto Human')}
        </Eyebrow>
        <Typography
          component="h3"
          sx={{
            maxWidth: 560,
            fontSize: 'clamp(28px, 3.4vw, 44px)',
            fontWeight: 500,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
          }}
        >
          If your parents can&apos;t use it, <GradientText>we&apos;re not done.</GradientText>
        </Typography>
        <Typography
          sx={{
            mt: 2,
            mb: 4,
            maxWidth: 520,
            fontSize: 16,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {t(
            'Remove complexity, speak plainly, and design for real people — not power users. Every screen, every error message, and every transaction should be explainable in a single sentence.'
          )}
        </Typography>

        {/* The principle, shown: a real Stellar error next to what the app says */}
        <Box
          sx={{
            mt: 'auto',
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            },
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              p: '14px 16px',
              border: HAIRLINE_ON_DARK,
              borderRadius: 'var(--radius-md)',
              bgcolor: 'rgba(255,255,255,0.04)',
            }}
          >
            <Eyebrow tone="dark" sx={{ mb: 0.75 }}>
              {t('Crypto says')}
            </Eyebrow>
            <Box
              sx={{
                fontFamily: MONO_FONT,
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                overflowWrap: 'anywhere',
              }}
            >
              tx_insufficient_balance
            </Box>
          </Box>

          <ArrowForwardIcon
            sx={{
              display: { xs: 'none', sm: 'block' },
              fontSize: 18,
              color: 'rgba(255,255,255,0.45)',
            }}
          />

          <Box sx={{ p: '14px 16px', borderRadius: 'var(--radius-md)', bgcolor: '#FFFFFF' }}>
            <Eyebrow sx={{ mb: 0.75 }}>{t('Normal says')}</Eyebrow>
            <Box sx={{ fontSize: 14, fontWeight: 500, color: '#0A0A0F' }}>
              {t('Add XLM to cover the network fee')}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function CoreValues() {
  const { t } = useTranslate();

  return (
    <PageSection id="core-values">
      <SectionHeader
        eyebrow="Our Principles"
        title={t('Core Values')}
        subtitle={t(
          'Five guiding principles that keep us focused on making crypto transparent, secure, and genuinely useful.'
        )}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(6, minmax(0, 1fr))',
          },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        <HumanCard />

        <ValueCard
          name="Security First"
          line="Cutting corners on security isn't a tradeoff. It's a failure."
          body="Audited contracts, battle-tested code, and 24/7 monitoring on every deployment. Halborn reviews every release before it touches mainnet. We treat your savings with the same seriousness you do."
        >
          <Stack spacing={1}>
            <Box sx={CHIP_SX}>
              <LiveDot />
              contracts: audited
            </Box>
            <Box sx={CHIP_SX}>
              <LiveDot pulse />
              monitoring: 24/7
            </Box>
          </Stack>
        </ValueCard>

        <ValueCard
          name="Permissionless Innovation"
          line="The best infrastructure is infrastructure no single company controls."
          body="Build composable primitives that anyone can extend, fork, or build on top of. Open SDK, public smart contracts, MIT-licensed components."
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
            {['extend()', 'fork()', 'build()'].map((item) => (
              <Box key={item} sx={{ ...CHIP_SX, px: '6px', justifyContent: 'center' }}>
                {item}
              </Box>
            ))}
          </Box>
        </ValueCard>

        <ValueCard
          name="Community Ownership"
          line="No backroom decisions. No surprise upgrades."
          body="NORM token holders create and vote on every proposal that shapes the protocol. The roadmap belongs to the people using the product — we're here to build what the community decides."
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {['propose', 'vote', 'ship'].map((step, i) => (
              <React.Fragment key={step}>
                {i > 0 && (
                  <ArrowForwardIcon sx={{ flexShrink: 0, fontSize: 14, color: '#9A9AA3' }} />
                )}
                <Box sx={{ ...CHIP_SX, flex: 1, px: '6px', justifyContent: 'center' }}>{step}</Box>
              </React.Fragment>
            ))}
          </Box>
        </ValueCard>

        <ValueCard
          name="Data > Hype"
          line="Hype fades. Real yield, real volume, and real retention don't."
          body="Let on-chain metrics guide every product decision. We don't ship features because they're trending — we ship them because usage data says users need them."
        >
          <Box
            aria-hidden="true"
            sx={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 56 }}
          >
            {BARS.map((height, i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  height: `${height}%`,
                  borderRadius: 'var(--radius-xs)',
                  background: BRAND_GRADIENT,
                  backgroundSize: `${BARS.length * 100}% 100%`,
                  backgroundPosition: `${(i / (BARS.length - 1)) * 100}% 0`,
                }}
              />
            ))}
          </Box>
        </ValueCard>
      </Box>
    </PageSection>
  );
}

export default CoreValues;

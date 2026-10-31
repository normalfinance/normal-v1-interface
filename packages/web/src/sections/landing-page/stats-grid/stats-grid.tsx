'use client';

import * as React from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';

import { Iconify } from '@/components/template/iconify';
import {
  Eyebrow,
  LiveDot,
  HeroBadge,
  BrandButton,
  PageSection,
  GradientText,
  SectionHeader,
  BLOCK_ON_DARK_SX,
} from '@/components/_common/brand';

// ----------------------------------------------------------------------

const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontFeatureSettings: '"ss01","ss02","zero"',
  fontVariantNumeric: 'tabular-nums',
} as const;

// Infrastructure totals — the providers Normal is built on (not Normal's own
// figures), so labels attribute them to LI.FI / Turnkey. Point-in-time values,
// hardcoded (verified from li.fi + turnkey.com, 2026-06).
const STATS = [
  { label: 'LI.FI volume', value: '$80B+', hint: 'cross-chain routed' },
  { label: 'LI.FI transfers', value: '100M+', hint: 'swaps & bridges' },
  { label: 'Turnkey volume', value: '$100B+', hint: 'stablecoin signed' },
  { label: 'Turnkey uptime', value: '99.9%', hint: 'signing infrastructure' },
];

// ----------------------------------------------------------------------

export type StatsGridProps = Record<string, never>;

export const StatsGrid: React.FC<StatsGridProps> = () => {
  const { t } = useTranslate();

  return (
    <PageSection tone="dark" aria-labelledby="trusted-heading">
      <HeroBadge tone="dark">
        <LiveDot tone="dark" pulse />
        Live on Stellar mainnet
      </HeroBadge>

      <SectionHeader
        id="trusted-heading"
        tone="dark"
        title={
          <>
            {t('Where money meets ')} <GradientText>{t('the future.')}</GradientText>
          </>
        }
        subtitle={t(
          'Built on Stellar, audited by Halborn, and trusted by users sending, saving, and earning across borders.'
        )}
        action={
          <BrandButton
            tone="dark"
            href={paths.socials.discord}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<Iconify icon="bxl:discord-alt" width={16} />}
          >
            {t('Join our Discord')}
          </BrandButton>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {STATS.map((stat) => (
          <Box
            key={stat.label}
            sx={{
              ...BLOCK_ON_DARK_SX,
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
              transition: 'border-color 150ms',
              '&:hover': { borderColor: 'rgba(255,255,255,0.16)' },
            }}
          >
            <Eyebrow tone="dark">{t(stat.label)}</Eyebrow>

            <Box>
              <Box
                component="span"
                sx={{
                  display: 'block',
                  fontSize: 'clamp(28px, 3.4vw, 44px)',
                  fontWeight: 400,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  color: '#fff',
                  ...MONO,
                }}
              >
                {stat.value}
              </Box>
              <Box
                component="span"
                sx={{
                  display: 'block',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.45)',
                  mt: '8px',
                  ...MONO,
                }}
              >
                {t(stat.hint)}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </PageSection>
  );
};

StatsGrid.displayName = 'StatsGrid';

'use client';

import * as React from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';

// ----------------------------------------------------------------------

const GRAD = 'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)';
const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontFeatureSettings: '"ss01","ss02","zero"',
  fontVariantNumeric: 'tabular-nums',
} as const;

// Infrastructure totals — the providers Normal is built on (not Normal's own
// figures), so labels attribute them to LI.FI / Turnkey. Point-in-time values,
// hardcoded (verified from li.fi + turnkey.com, 2026-06).
const STATS = [
  { label: 'LI.FI volume',    value: '$80B+',  hint: 'cross-chain routed' },
  { label: 'LI.FI transfers', value: '100M+',  hint: 'swaps & bridges' },
  { label: 'Turnkey volume',  value: '$100B+', hint: 'stablecoin signed' },
  { label: 'Turnkey uptime',  value: '99.9%',  hint: 'signing infrastructure' },
];

// ----------------------------------------------------------------------

const SectionRoot = styled('section')({
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#0A0A0F',
  color: '#fff',
  isolation: 'isolate',
});

const Inner = styled('div')(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  maxWidth: 1200,
  margin: '0 auto',
  padding: `${theme.spacing(13)} ${theme.spacing(3)}`,
}));

// ----------------------------------------------------------------------

export type StatsGridProps = React.ComponentPropsWithoutRef<'section'>;

export const StatsGrid: React.FC<StatsGridProps> = (props) => {
  const { t } = useTranslate();

  return (
    <SectionRoot aria-labelledby="trusted-heading" {...props}>

      {/* Aurora glow */}
      <Box sx={{
        position: 'absolute', inset: '-10%', zIndex: 0, pointerEvents: 'none',
        background: [
          'radial-gradient(closest-side at 15% 30%, rgba(91,207,255,0.22), transparent 60%)',
          'radial-gradient(closest-side at 85% 70%, rgba(255,176,96,0.16), transparent 60%)',
          'radial-gradient(closest-side at 60% 15%, rgba(255,123,197,0.16), transparent 60%)',
          'radial-gradient(closest-side at 35% 85%, rgba(177,123,255,0.22), transparent 60%)',
        ].join(','),
        filter: 'blur(40px)',
        opacity: 0.85,
      }} />

      {/* Dot grid */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
        maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
      }} />

      <Inner>
        {/* Live pill */}
        <Box
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            px: '14px', py: '6px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '999px',
            fontSize: '13px', fontWeight: 500,
            color: 'rgba(255,255,255,0.85)',
            mb: '24px',
          }}
        >
          <Box sx={{
            width: 7, height: 7, borderRadius: '50%', bgcolor: '#1AB37D',
            boxShadow: '0 0 0 3px rgba(26,179,125,0.2)',
            animation: 'statsPulse 2.4s ease-in-out infinite',
            '@keyframes statsPulse': {
              '0%,100%': { boxShadow: '0 0 0 3px rgba(26,179,125,0.18)' },
              '50%': { boxShadow: '0 0 0 6px rgba(26,179,125,0.08)' },
            },
          }} />
          Live on Stellar mainnet
        </Box>

        {/* Header row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'flex-end' },
            gap: 4,
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {/* Left */}
          <Box>
            <Box
              component="h2"
              id="trusted-heading"
              sx={{
                m: 0,
                fontSize: 'clamp(34px, 4.4vw, 56px)',
                fontWeight: 500,
                letterSpacing: '-0.03em',
                lineHeight: 1.08,
                color: '#fff',
                maxWidth: '18ch',
              }}
            >
              {t('Where money meets ')}{' '}
              <Box
                component="span"
                sx={{
                  background: GRAD,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t('the future.')}
              </Box>
            </Box>

            <Box
              component="p"
              sx={{
                m: 0,
                mt: '16px',
                fontSize: '15px',
                color: 'rgba(255,255,255,0.55)',
                maxWidth: '52ch',
                lineHeight: 1.6,
              }}
            >
              {t(
                'Built on Stellar, audited by Halborn, and trusted by users sending, saving, and earning across borders.'
              )}
            </Box>
          </Box>

          {/* Right — CTA */}
          <Box sx={{ flexShrink: 0 }}>
            <Button
              component="a"
              href={paths.socials.discord}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<Iconify icon="bxl:discord-alt" width={16} />}
              sx={{
                height: 44,
                px: '20px',
                borderRadius: '999px',
                bgcolor: '#fff',
                color: '#0A0A0F',
                fontWeight: 600,
                fontSize: '14px',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                transition: 'background 150ms, transform 150ms',
                '&:hover': {
                  bgcolor: '#f4f4f7',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {t('Join our Discord')}
            </Button>
          </Box>
        </Box>

        {/* Stats grid */}
        <Box
          sx={{
            mt: '56px',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr 1fr',
              md: 'repeat(4, 1fr)',
            },
            gap: '14px',
          }}
        >
          {STATS.map((stat) => (
            <Box
              key={stat.label}
              sx={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '20px',
                p: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '32px',
                backdropFilter: 'blur(8px)',
                transition: 'border-color 200ms, background 200ms',
                '&:hover': {
                  background: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.12)',
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: '11px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                {t(stat.label)}
              </Box>

              <Box>
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    fontSize: 'clamp(36px, 3.4vw, 48px)',
                    fontWeight: 500,
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
                    color: 'rgba(255,255,255,0.35)',
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
      </Inner>
    </SectionRoot>
  );
};

StatsGrid.displayName = 'StatsGrid';

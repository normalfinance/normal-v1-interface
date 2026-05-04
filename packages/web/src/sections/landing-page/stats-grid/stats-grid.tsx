'use client';

import * as React from 'react';
import { useTranslate } from '@/locales';
import { paths } from '@/routes/paths';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';

// ----------------------------------------------------------------------

const STATS = [
  { label: 'Total deposits', value: '$24M+', hint: 'across USDC vaults' },
  { label: 'Active wallets', value: '12.8K', hint: 'and growing daily' },
  { label: 'Countries served', value: '50+', hint: 'fiat ramps live' },
  { label: 'Avg. settlement', value: '0.5s', hint: 'on Stellar mainnet' },
];

// ----------------------------------------------------------------------

const SectionRoot = styled('section')({
  backgroundColor: '#0c0c0e',
  color: '#fff',
});

const Inner = styled('div')(({ theme }) => ({
  maxWidth: 1200,
  margin: '0 auto',
  padding: `${theme.spacing(12)} ${theme.spacing(3)}`,
}));

const StatCard = styled('div')({
  backgroundColor: '#15151a',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
  padding: 28,
  minHeight: 180,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
});

// ----------------------------------------------------------------------

export type StatsGridProps = React.ComponentPropsWithoutRef<'section'>;

export const StatsGrid: React.FC<StatsGridProps> = (props) => {
  const { t } = useTranslate();

  return (
    <SectionRoot aria-labelledby="trusted-heading" {...props}>
      <Inner>
        {/* Header row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 4,
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'flex-end' },
          }}
        >
          {/* Left */}
          <Box>
            <Box
              component="p"
              sx={{
                m: 0,
                mb: '14px',
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#8a8a93',
              }}
            >
              {t('— Trusted globally')}
            </Box>

            <Box
              component="h2"
              id="trusted-heading"
              sx={{
                m: 0,
                fontSize: 'clamp(34px, 4.4vw, 56px)',
                fontWeight: 600,
                letterSpacing: '-0.03em',
                lineHeight: 1.04,
                color: '#fff',
                maxWidth: '22ch',
              }}
            >
              {t('Where money meets the future.')}
            </Box>

            <Box
              component="p"
              sx={{
                m: 0,
                mt: '14px',
                fontSize: 17,
                color: '#a8a8b0',
                maxWidth: '60ch',
                lineHeight: 1.5,
              }}
            >
              {t(
                'Built on Stellar, audited by Halborn, and trusted by thousands of users sending, saving, and earning across borders.'
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
                color: '#0c0c0e',
                fontWeight: 600,
                fontSize: '14.5px',
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
            mt: 7,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          {STATS.map((stat) => (
            <StatCard key={stat.label}>
              <Box
                component="span"
                sx={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#8a8a93',
                }}
              >
                {t(stat.label)}
              </Box>

              <Box>
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    fontSize: 48,
                    fontWeight: 600,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    color: '#fff',
                  }}
                >
                  {stat.value}
                </Box>
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    fontSize: 12.5,
                    color: '#8a8a93',
                    mt: '6px',
                  }}
                >
                  {t(stat.hint)}
                </Box>
              </Box>
            </StatCard>
          ))}
        </Box>
      </Inner>
    </SectionRoot>
  );
};

StatsGrid.displayName = 'StatsGrid';

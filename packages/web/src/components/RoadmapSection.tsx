'use client';

import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

// ----------------------------------------------------------------------

type Status = 'live' | 'soon' | 'plan';

type Phase = {
  status: Status;
  statusLabel: string;
  title: string;
  when: string;
  bullets: string[];
};

const PHASES: Phase[] = [
  {
    status: 'live',
    statusLabel: 'Live',
    title: 'Foundation',
    when: 'Q1 — Q2 2026',
    bullets: [
      'Non-custodial Stellar wallet, mobile + web',
      'USDC high-yield savings (8.2% APY)',
      'Fiat on/off-ramps in 50+ countries',
      'Halborn audit complete',
    ],
  },
  {
    status: 'soon',
    statusLabel: 'Soon',
    title: 'Expansion',
    when: 'Q3 2026',
    bullets: [
      'BTC and ETH support via bridges',
      'Recurring deposits and auto-compound',
      'Card spending — pay anywhere with USDC',
      'Referral and rewards program',
    ],
  },
  {
    status: 'plan',
    statusLabel: 'Planned',
    title: 'Maturity',
    when: 'Q4 2026 — 2027',
    bullets: [
      'Real-world assets (treasuries, ETFs)',
      'Multi-chain wallet (Solana, Base)',
      'Institutional savings vaults',
      'Open developer SDK and on-chain identity',
    ],
  },
];

const BULLET = '●';

// ----------------------------------------------------------------------

const statusStyles: Record<Status, { bg: string; color: string; border: string; dot: string }> = {
  live: { bg: '#eafff4', color: '#047a3a', border: '#cdf2dc', dot: '#047a3a' },
  soon: { bg: '#fff4e6', color: '#b25500', border: '#ffe1bd', dot: '#b25500' },
  plan: { bg: '#fafafa', color: '#6b6b76', border: '#e8e8ec', dot: '#9a9aa3' },
};

const PhaseCard = styled('article')({
  backgroundColor: '#fff',
  border: '1px solid rgba(10,10,15,0.08)',
  borderRadius: 22,
  padding: 28,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  transition: 'border-color 200ms, background 200ms',
  '&:hover': {
    borderColor: 'rgba(10,10,15,0.12)',
    background: '#fdfdfd',
  },
});

// ----------------------------------------------------------------------

export default function RoadmapSection() {
  const { t } = useTranslate();

  return (
    <Box
      component="section"
      aria-labelledby="roadmap-heading"
      sx={{
        bgcolor: '#FAFAFB',
        py: { xs: '40px', md: '56px' },
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center' }}>
          <Box
            component="p"
            sx={{
              m: 0,
              mb: '14px',
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: '#6b6b76',
            }}
          >
            {t('— Roadmap')}
          </Box>

          <Box
            component="h2"
            id="roadmap-heading"
            sx={{
              m: 0,
              fontSize: 'clamp(34px, 4.4vw, 56px)',
              fontWeight: 500,
              letterSpacing: '-0.03em',
              lineHeight: 1.04,
              color: '#0a0a0b',
            }}
          >
            {t("Where we're going.")}
          </Box>

          <Box
            component="p"
            sx={{
              m: 0,
              mt: '14px',
              fontSize: '15px',
              color: '#6b6b76',
              maxWidth: '60ch',
              lineHeight: 1.6,
              mx: 'auto',
            }}
          >
            {t(
              'A three-phase plan to make crypto feel as effortless as opening a checking account — and a lot more rewarding.'
            )}
          </Box>
        </Box>

        {/* Phase grid */}
        <Box
          sx={{
            mt: '56px',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: '14px',
            alignItems: 'stretch',
          }}
        >
          {PHASES.map((phase) => {
            const s = statusStyles[phase.status];
            return (
              <PhaseCard key={phase.title}>
                {/* Status tag */}
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    alignSelf: 'flex-start',
                    height: 26,
                    px: '10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 500,
                    bgcolor: s.bg,
                    color: s.color,
                    border: `1px solid ${s.border}`,
                  }}
                >
                  <Box component="span" sx={{ color: s.dot, fontSize: 7, lineHeight: 1 }}>
                    {BULLET}
                  </Box>
                  {t(phase.statusLabel)}
                </Box>

                {/* Title */}
                <Box
                  component="h3"
                  sx={{
                    m: 0,
                    mt: '20px',
                    mb: '4px',
                    fontSize: '22px',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    color: '#0a0a0b',
                  }}
                >
                  {t(phase.title)}
                </Box>

                {/* Timeframe */}
                <Box
                  component="span"
                  sx={{
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#9a9aa3',
                  }}
                >
                  {phase.when}
                </Box>

                {/* Bullets */}
                <Box
                  component="ul"
                  sx={{ m: 0, mt: '20px', p: 0, listStyle: 'none', flex: 1 }}
                >
                  {phase.bullets.map((bullet) => (
                    <Box
                      component="li"
                      key={bullet}
                      sx={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        py: '11px',
                        borderTop: '1px solid #f0f0f3',
                        fontSize: '13.5px',
                        color: '#3a3a44',
                        lineHeight: 1.5,
                      }}
                    >
                      <Box
                        component="span"
                        aria-hidden="true"
                        sx={{ color: s.dot, flexShrink: 0, fontSize: 9, mt: '5px' }}
                      >
                        {BULLET}
                      </Box>
                      {t(bullet)}
                    </Box>
                  ))}
                </Box>
              </PhaseCard>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

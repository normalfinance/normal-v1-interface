'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import EarnAnimation from '@/components/ui/earn-animation';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
const GRAD = 'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)';

const GRAD_TEXT_SX = {
  background: GRAD,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} as const;

const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontFeatureSettings: '"ss01","ss02","zero"',
  fontVariantNumeric: 'tabular-nums',
} as const;

const CARD_BASE = {
  background: '#fff',
  border: '1px solid rgba(10,10,15,0.08)',
  borderRadius: '22px',
  padding: '36px',
  overflow: 'hidden',
} as const;

const EYEBROW_SX = {
  fontSize: '11px',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#6B6B76',
  mb: 1.5,
} as const;

const CARD_H3_SX = {
  fontSize: '22px',
  letterSpacing: '-0.02em',
  fontWeight: 500,
  color: '#0A0A0F',
  lineHeight: 1.25,
} as const;

/* ------------------------------------------------------------------ */
/* SavingsBigCard — uses EarnAnimation                                */
/* ------------------------------------------------------------------ */

function SavingsBigCard({ liveApy }: { liveApy: number | null }) {
  return (
    <Box
      sx={{
        ...CARD_BASE,
        gridColumn: { xs: '1 / -1', md: 'span 4' },
        gridRow: { xs: 'auto', md: 'span 2' },
        minHeight: { xs: 480, md: 'auto' },
        padding: 0,
        overflow: 'hidden',
        background: '#0A0A0F',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Radial glow */}
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(110,139,255,0.15) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Dot grid */}
      <Box sx={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
        maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
        pointerEvents: 'none',
      }} />
      <Box sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <EarnAnimation liveApy={liveApy} />
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* BorderlessCard — uses WorldMap                                     */
/* ------------------------------------------------------------------ */
/* RealYieldCard                                                       */
/* ------------------------------------------------------------------ */
const FLOW_NODES = [
  { label: 'Your USDC', sub: 'deposited' },
  { label: 'Blend Pool', sub: 'Stellar · Soroban' },
  { label: 'Borrowers', sub: 'over-collateralised' },
];

function RealYieldCard({ liveApy }: { liveApy: number | null }) {
  const apy = liveApy;

  return (
    <Box
      sx={{
        ...CARD_BASE,
        gridColumn: { xs: '1 / -1', md: 'span 3' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Box>
        <Typography sx={EYEBROW_SX}>Yield source</Typography>
        <Typography sx={CARD_H3_SX}>Real yield. Real borrowers.</Typography>
        <Typography sx={{ fontSize: '13px', color: '#6B6B76', mt: 0.75, lineHeight: 1.55 }}>
          Your interest comes from over-collateralised USDC borrowers on Blend Protocol — not algorithmic promises.
        </Typography>
      </Box>

      {/* Live APY hero */}
      <Box sx={{ my: 'auto', py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography
            sx={{
              ...MONO,
              fontSize: '64px',
              fontWeight: 500,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: '#0A0A0F',
              transition: 'all 0.4s ease',
            }}
          >
            {apy != null ? Number(apy).toFixed(2) : '~8'}
          </Typography>
          <Typography sx={{ ...MONO, fontSize: '26px', color: '#9A9AA3', fontWeight: 400, mb: '4px' }}>
            % APY
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '12px', color: '#9A9AA3', mt: 0.75 }}>
          live rate · Blend Protocol · Stellar
        </Typography>
      </Box>

      {/* Flow diagram */}
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {FLOW_NODES.map((node, i) => (
            <>
              <Box
                key={node.label}
                sx={{
                  flex: 1,
                  background: i === 1 ? '#0A0A0F' : '#F7F7F9',
                  border: `1px solid ${i === 1 ? 'transparent' : 'rgba(10,10,15,0.07)'}`,
                  borderRadius: '12px',
                  px: '10px',
                  py: '10px',
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600, color: i === 1 ? '#fff' : '#0A0A0F', lineHeight: 1.2, mb: 0.3 }}>
                  {node.label}
                </Typography>
                <Typography sx={{ fontSize: '9.5px', color: i === 1 ? 'rgba(255,255,255,0.45)' : '#9A9AA3', lineHeight: 1, ...MONO }}>
                  {node.sub}
                </Typography>
              </Box>
              {i < FLOW_NODES.length - 1 && (
                <Typography key={`arrow-${i}`} sx={{ fontSize: '14px', color: '#C8C8D0', flexShrink: 0 }}>→</Typography>
              )}
            </>
          ))}
        </Box>
      </Box>

    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* StellarSpeedCard                                                    */
/* ------------------------------------------------------------------ */
function StellarSpeedCard() {
  const [ms, setMs] = useState(480);

  useEffect(() => {
    const id = setInterval(() => {
      setMs(Math.floor(Math.random() * 200 + 380));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <Box
      sx={{
        ...CARD_BASE,
        gridColumn: { xs: '1 / -1', sm: 'span 1', md: 'span 2' },
      }}
    >
      <Typography sx={EYEBROW_SX}>Stellar Network</Typography>
      <Typography sx={CARD_H3_SX}>
        Settle in <Box component="span" sx={{ color: '#9A9AA3' }}>seconds</Box>
      </Typography>
      <Typography sx={{ fontSize: '13.5px', color: '#6B6B76', mt: 1, mb: 3, lineHeight: 1.55 }}>
        Stellar finalizes in under 5 seconds — no waiting, no gas wars.
      </Typography>

      {/* Speed chips */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={KCHIP_SX}>
          <Box component="span" sx={{ fontSize: '15px' }}>⚡</Box>
          <Box component="span" sx={KCHIP_TEXT_SX}>avg_settlement:&nbsp;~{(ms / 1000).toFixed(1)}s</Box>
        </Box>
        <Box sx={KCHIP_SX}>
          <Box component="span" sx={{ fontSize: '15px' }}>💸</Box>
          <Box component="span" sx={KCHIP_TEXT_SX}>network_fee:&nbsp;&lt;$0.001</Box>
        </Box>
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* BackedByCard                                                        */
/* ------------------------------------------------------------------ */
const BACKERS = [
  {
    initials: 'SDF',
    name: 'Stellar Development Foundation',
    role: 'Lead investor & advisor',
    color: '#1B9FFF',
  },
  {
    initials: 'TD',
    name: 'DraperU Ventures',
    role: 'Tim Draper · Lead investor',
    color: '#7C5CFC',
  },
];

function BackedByCard() {
  return (
    <Box sx={{ ...CARD_BASE, gridColumn: { xs: '1 / -1', md: 'span 3' }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Box>
        <Typography sx={EYEBROW_SX}>Backed by</Typography>
        <Typography sx={{ ...CARD_H3_SX, mb: 1 }}>
          Trusted by leaders.
        </Typography>
        <Typography sx={{ fontSize: '13px', color: '#6B6B76', lineHeight: 1.55, mb: 3 }}>
          Normal is backed by the most credible names in crypto and venture — giving you confidence your funds are in safe hands.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {BACKERS.map((b) => (
          <Box
            key={b.name}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: '#F7F7F9',
              border: '1px solid rgba(10,10,15,0.07)',
              borderRadius: '14px',
              px: '16px',
              py: '13px',
            }}
          >
            {/* Initials badge */}
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: `${b.color}18`,
                border: `1px solid ${b.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: b.color, ...MONO, letterSpacing: '0.02em' }}>
                {b.initials}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#0A0A0F', lineHeight: 1.2 }}>
                {b.name}
              </Typography>
              <Typography sx={{ fontSize: '11.5px', color: '#9A9AA3', mt: 0.25 }}>
                {b.role}
              </Typography>
            </Box>
          </Box>
        ))}

        {/* Valuation tag */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1AB37D', flexShrink: 0 }} />
          <Typography sx={{ fontSize: '11.5px', color: '#6B6B76' }}>
            $4M valuation round · bridge funding
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* NonCustodialCard                                                    */
/* ------------------------------------------------------------------ */
const KCHIP_SX = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: '#F7F7F9',
  border: '1px solid rgba(10,10,15,0.07)',
  borderRadius: '14px',
  px: '14px',
  py: '10px',
  overflow: 'hidden',
  ...MONO,
  fontSize: '13px',
  fontWeight: 500,
  color: '#2A2A33',
} as const;

const KCHIP_TEXT_SX = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
} as const;

function NonCustodialCard() {
  const [rotated, setRotated] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setRotated((r) => !r), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <Box sx={{ ...CARD_BASE, gridColumn: { xs: '1 / -1', sm: 'span 1', md: 'span 2' } }}>
      <Typography sx={EYEBROW_SX}>Security</Typography>
      <Typography sx={{ ...CARD_H3_SX, mb: 1 }}>
        Non-custodial by design
      </Typography>
      <Typography sx={{ fontSize: '13.5px', color: '#6B6B76', lineHeight: 1.6, mb: 3 }}>
        Your keys, your funds. Normal never holds your assets — everything is on-chain on Stellar.
        Withdraw to any wallet, anytime, with no permission needed.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Key chip */}
        <Box sx={KCHIP_SX}>
          <Box
            sx={{
              display: 'inline-block',
              transition: 'transform 0.6s ease',
              transform: rotated ? 'rotate(15deg)' : 'rotate(0deg)',
              fontSize: '16px',
            }}
          >
            🔑
          </Box>
          <Box component="span" sx={KCHIP_TEXT_SX}>your_private_key.stellar</Box>
        </Box>

        {/* Self-custody pill */}
        <Box sx={KCHIP_SX}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#1AB37D',
              flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(26,179,125,0.2)',
            }}
          />
          <Box component="span" sx={KCHIP_TEXT_SX}>self_custody: verified</Box>
        </Box>
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* BentoSection                                                        */
/* ------------------------------------------------------------------ */
export function BentoSection() {
  const [liveApy, setLiveApy] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/savings/vault-info?network=mainnet')
      .then((r) => r.json())
      .then((data) => {
        if (data?.vault?.apy != null) setLiveApy(Number(data.vault.apy));
      })
      .catch(() => {});
  }, []);

  return (
    <Box component="section" sx={{ py: { xs: '64px', md: '110px' }, background: '#FAFAFB' }}>
      <Container maxWidth={false} sx={{ maxWidth: '1240px', px: { xs: 2, sm: 3 } }}>
        {/* Eyebrow */}
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography
            sx={{
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#6B6B76',
            }}
          >
            ✦ Everything you need
          </Typography>
        </Box>

        {/* Headline */}
        <Typography
          sx={{
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 500,
            letterSpacing: '-0.03em',
            color: '#0A0A0F',
            textAlign: 'center',
            lineHeight: 1.15,
            mb: '56px',
          }}
        >
          Simple, safe, and earning
        </Typography>

        {/* Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' },
            gridAutoRows: { xs: 'auto', md: 'minmax(290px, auto)' },
            gap: { xs: '10px', md: '14px' },
          }}
        >
          <SavingsBigCard liveApy={liveApy} />
          <NonCustodialCard />
          <StellarSpeedCard />
          <BackedByCard />
          <RealYieldCard liveApy={liveApy} />
        </Box>
      </Container>
    </Box>
  );
}

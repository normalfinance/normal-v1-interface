'use client';

import { useEffect, useState } from 'react';

import { cdn } from '@normalfinance/utils';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import WorldMap from '@/components/ui/world-map';
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
const MAP_DOTS = [
  { start: { lat: 64.2008, lng: -149.4937 }, end: { lat: 34.0522, lng: -118.2437 } },
  { start: { lat: 64.2008, lng: -149.4937 }, end: { lat: -15.7975, lng: -47.8919 } },
  { start: { lat: -15.7975, lng: -47.8919 }, end: { lat: 38.7223, lng: -9.1393 } },
  { start: { lat: 51.5074, lng: -0.1278 },   end: { lat: 28.6139, lng: 77.209 } },
  { start: { lat: 28.6139, lng: 77.209 },    end: { lat: 43.1332, lng: 131.9113 } },
  { start: { lat: 28.6139, lng: 77.209 },    end: { lat: -1.2921, lng: 36.8219 } },
];

function SavingsBigCard() {
  return (
    <Box
      sx={{
        ...CARD_BASE,
        gridColumn: { xs: '1 / -1', md: 'span 4' },
        gridRow: { xs: 'auto', md: 'span 2' },
        minHeight: { xs: 480, md: 'auto' },
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <EarnAnimation />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* BorderlessCard — uses WorldMap                                     */
/* ------------------------------------------------------------------ */
function BorderlessCard() {
  return (
    <Box
      sx={{
        ...CARD_BASE,
        gridColumn: { xs: '1 / -1', sm: 'span 1', md: 'span 2' },
        minHeight: { xs: 320, sm: 'auto' },
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ px: '36px', pt: '36px', pb: '16px' }}>
        <Typography sx={EYEBROW_SX}>Global Access</Typography>
        <Typography sx={CARD_H3_SX}>Borderless by design</Typography>
        <Typography sx={{ fontSize: '13px', color: '#6B6B76', mt: 0.75, lineHeight: 1.55 }}>
          Your zip code shouldn't determine your returns.
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <WorldMap
          backgroundSrc={cdn('about-page/world-map.webp')}
          dots={MAP_DOTS}
          lineColor="#B17BFF"
        />
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
        background: '#0A0A0F',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Radial glow */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(110,139,255,0.18) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      {/* Dot grid */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
          pointerEvents: 'none',
        }}
      />

      <Box sx={{ position: 'relative' }}>
        <Typography sx={{ ...EYEBROW_SX, color: 'rgba(255,255,255,0.4)' }}>Stellar Network</Typography>
        <Typography sx={{ ...CARD_H3_SX, color: '#fff' }}>
          Settle in <Box component="span" sx={{ ...GRAD_TEXT_SX }}>seconds</Box>
        </Typography>
        <Typography sx={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)', mt: 1, mb: 3, lineHeight: 1.55 }}>
          Stellar finalizes in under 5 seconds — no waiting, no gas wars.
        </Typography>

        {/* Speed display */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography
            sx={{
              ...MONO,
              fontSize: '52px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              transition: 'all 0.3s ease',
            }}
          >
            ~{(ms / 1000).toFixed(1)}
          </Typography>
          <Typography sx={{ ...MONO, fontSize: '20px', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
            s
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', mt: 0.5 }}>
          average settlement time
        </Typography>
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* HowItWorksCard                                                      */
/* ------------------------------------------------------------------ */
const STEPS = [
  { label: 'Connect your wallet', desc: 'Use Freighter, Lobstr, or create a new Normal wallet in seconds.' },
  { label: 'Deposit USDC', desc: 'Transfer USDC or buy directly with fiat through our on-ramp partners.' },
  { label: 'Earn automatically', desc: 'Your funds are deployed to Blend Protocol and yield starts accruing immediately.' },
];

function HowItWorksCard() {
  return (
    <Box sx={{ ...CARD_BASE, gridColumn: { xs: '1 / -1', md: 'span 3' } }}>
      <Typography sx={EYEBROW_SX}>How it works</Typography>
      <Typography sx={{ ...CARD_H3_SX, mb: 3 }}>
        Three steps to earning
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {STEPS.map((step, i) => (
          <Box key={step.label} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
            {/* Line + circle column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 25 }}>
              <Box
                sx={{
                  width: 25,
                  height: 25,
                  borderRadius: '50%',
                  background: i === STEPS.length - 1 ? GRAD : '#0A0A0F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                {i + 1}
              </Box>
              {i < STEPS.length - 1 && (
                <Box sx={{ width: '1px', flexGrow: 1, background: 'rgba(10,10,15,0.08)', minHeight: 24, my: 0.5 }} />
              )}
            </Box>
            {/* Content */}
            <Box sx={{ pb: i < STEPS.length - 1 ? 2.5 : 0, pt: '2px' }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#0A0A0F', mb: 0.4 }}>
                {step.label}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#6B6B76', lineHeight: 1.55 }}>
                {step.desc}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* NonCustodialCard                                                    */
/* ------------------------------------------------------------------ */
const KCHIP_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  background: '#F7F7F9',
  border: '1px solid rgba(10,10,15,0.07)',
  borderRadius: '14px',
  px: '14px',
  py: '10px',
  ...MONO,
  fontSize: '13px',
  fontWeight: 500,
  color: '#2A2A33',
} as const;

function NonCustodialCard() {
  const [rotated, setRotated] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setRotated((r) => !r), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <Box sx={{ ...CARD_BASE, gridColumn: { xs: '1 / -1', md: 'span 3' } }}>
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
          <span>your_private_key.stellar</span>
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
          <span>self_custody: verified</span>
        </Box>
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* BentoSection                                                        */
/* ------------------------------------------------------------------ */
export function BentoSection() {
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
          <SavingsBigCard />
          <BorderlessCard />
          <StellarSpeedCard />
          <HowItWorksCard />
          <NonCustodialCard />
        </Box>
      </Container>
    </Box>
  );
}

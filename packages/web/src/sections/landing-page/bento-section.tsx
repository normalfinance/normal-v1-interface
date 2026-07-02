'use client';

import { cdn } from '@normalfinance/utils';
import { useRouter } from 'next/navigation';
import { useVaultApy } from '@/hooks/use-vault-apy';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';

import EarnAnimation from '@/components/ui/earn-animation';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
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

const CAROUSEL_SLIDES = [
  {
    href: '/savings',
    eyebrow: 'Normal Savings',
    title: 'Earn yield on your USDC',
    description: 'Deposit USDC and earn real yield through Blend Protocol — self-custody, no middlemen.',
    image: cdn('mockups/savings2.webp'),
  },
  {
    href: '/portfolio',
    eyebrow: 'Your Portfolio',
    title: 'Track everything in one place',
    description: 'Wallet balance, savings position, and lifetime earnings — all in one view.',
    image: cdn('mockups/portfolio.webp'),
  },
];

function MockupCarouselCard() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(0);

  const goTo = useCallback((index: number) => setSlide(index), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlide((s) => (s + 1) % CAROUSEL_SLIDES.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const current = CAROUSEL_SLIDES[slide];
  const prev = (slide - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length;
  const next = (slide + 1) % CAROUSEL_SLIDES.length;

  return (
    <Box
      sx={{
        ...CARD_BASE,
        padding: 0,
        gridColumn: { xs: '1 / -1', md: 'span 3' },
        position: 'relative',
        minHeight: 320,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'box-shadow 200ms',
        '&:hover': { boxShadow: '0 8px 32px rgba(10,10,15,0.18)' },
      }}
      onClick={() => router.push(current.href)}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const delta = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(delta) > 40) goTo(delta > 0 ? next : prev);
      }}
    >
      {/* Cross-fading images — all rendered, opacity toggled */}
      {CAROUSEL_SLIDES.map((s, i) => (
        <Box
          key={i}
          component="img"
          src={s.image}
          alt={s.title}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top',
            display: 'block',
            transition: 'opacity 600ms ease',
            opacity: i === slide ? 1 : 0,
          }}
        />
      ))}

      {/* Dark gradient — bottom portion */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)',
      }} />

      {/* Bottom overlay — text left, arrows + dots right */}
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        px: '20px', pb: '18px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2,
      }}>
        {/* Text — bottom left */}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ ...CARD_H3_SX, color: '#fff', mb: 0.5, fontSize: '18px' }}>
            {current.title}
          </Typography>
          <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            {current.description}
          </Typography>
        </Box>

        {/* Dots + arrows — bottom right */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {CAROUSEL_SLIDES.map((_, i) => (
              <Box
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                sx={{
                  width: i === slide ? 18 : 5, height: 5,
                  borderRadius: '999px',
                  bgcolor: i === slide ? '#fff' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', transition: 'all 220ms ease',
                }}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: '6px' }}>
            {(['prev', 'next'] as const).map((dir) => (
              <Box
                key={dir}
                onClick={(e) => { e.stopPropagation(); goTo(dir === 'prev' ? prev : next); }}
                sx={{
                  width: 30, height: 30, borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'background 150ms, transform 150ms',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.28)', transform: 'scale(1.08)' },
                }}
              >
                {dir === 'prev'
                  ? <ArrowBackOutlinedIcon sx={{ fontSize: 15, color: '#fff' }} />
                  : <ArrowForwardOutlinedIcon sx={{ fontSize: 15, color: '#fff' }} />
                }
              </Box>
            ))}
          </Box>
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
    name: 'Stellar Development Foundation',
    role: 'Lead investor & advisor',
    logo: cdn('homepage/stellar-logo.webp'),
    href: 'https://stellar.org',
  },
  {
    name: 'DraperU Ventures',
    role: 'Tim Draper · Lead investor',
    logo: cdn('homepage/draper-university.webp'),
    href: 'https://draperuniversity.com',
  },
];

function BackedByCard() {
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
      {/* Header */}
      <Box>
        <Typography sx={EYEBROW_SX}>Backed by</Typography>
        <Typography sx={{ ...CARD_H3_SX, mb: 1 }}>
          Trusted by leaders.
        </Typography>
        <Typography sx={{ fontSize: '13px', color: '#6B6B76', lineHeight: 1.6 }}>
          The most credible names in crypto and venture — giving you confidence your funds are in safe hands.
        </Typography>
      </Box>

      {/* Backer rows */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', mt: 3 }}>
        {BACKERS.map((b) => (
          <Box
            key={b.name}
            component="a"
            href={b.href}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              background: '#fff',
              border: '1px solid rgba(10,10,15,0.07)',
              borderRadius: '16px',
              px: '16px',
              py: '14px',
              boxShadow: '0 1px 4px rgba(10,10,15,0.05)',
              transition: 'box-shadow 150ms, border-color 150ms',
              textDecoration: 'none',
              cursor: 'pointer',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(10,10,15,0.09)',
                borderColor: 'rgba(10,10,15,0.13)',
              },
            }}
          >
            {/* Logo container */}
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '12px',
                background: '#F4F4F7',
                border: '1px solid rgba(10,10,15,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                p: '6px',
              }}
            >
              <Box
                component="img"
                src={b.logo}
                alt={b.name}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: 'brightness(0)',
                  opacity: 0.75,
                }}
              />
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#0A0A0F', lineHeight: 1.2 }}>
                {b.name}
              </Typography>
              <Typography sx={{ fontSize: '11.5px', color: '#9A9AA3', mt: '3px' }}>
                {b.role}
              </Typography>
            </Box>

            {/* Checkmark badge */}
            <Box sx={{
              width: 22, height: 22, borderRadius: '50%',
              bgcolor: 'rgba(26,179,125,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Box component="span" sx={{ fontSize: '11px', color: '#1AB37D', lineHeight: 1 }}>✓</Box>
            </Box>
          </Box>
        ))}

        {/* Valuation tag */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: '4px' }}>
          <Box sx={{
            width: 6, height: 6, borderRadius: '50%', bgcolor: '#1AB37D', flexShrink: 0,
            boxShadow: '0 0 0 3px rgba(26,179,125,0.18)',
          }} />
          <Typography sx={{ fontSize: '11.5px', color: '#9A9AA3' }}>
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
  const liveApy = useVaultApy();

  return (
    <Box component="section" sx={{ py: { xs: '80px', md: '110px' }, background: '#FAFAFB' }}>
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
            — Everything you need
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
          <MockupCarouselCard />
        </Box>
      </Container>
    </Box>
  );
}

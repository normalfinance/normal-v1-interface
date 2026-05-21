'use client';

import { useTranslate } from '@/locales';
import React, { useRef, useState, useEffect } from 'react';

import { Box, Stack, Typography } from '@mui/material';

// ----------------------------------------------------------------------

const INITIAL = 10_000;
const APY = 15;
const YEARS = 10;
const CYCLE_MS = 6000;
const MONTHS = YEARS * 12 + 1;

const svgW = 400;
const svgH = 100;

const BRAND_COLOR = '#818cf8';

const POINTS = (() => {
  const vals = Array.from({ length: MONTHS }, (_, i) =>
    INITIAL * Math.pow(1 + APY / 100, i / 12)
  );
  const min = vals[0];
  const max = vals[MONTHS - 1];
  const range = max - min;
  return vals.map((v, i) => ({
    x: (i / (MONTHS - 1)) * svgW,
    y: svgH - ((v - min) / range) * (svgH * 0.88) - svgH * 0.06,
  }));
})();

const LINE_D = `M ${POINTS.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
const AREA_D = `${LINE_D} L ${svgW},${svgH} L 0,${svgH} Z`;
const MAX_BALANCE = INITIAL * Math.pow(1 + APY / 100, YEARS);

const GRID = (() => {
  const min = INITIAL;
  const range = MAX_BALANCE - min;
  return [20_000, 30_000, 40_000].map((value) => {
    const y = svgH - ((value - min) / range) * (svgH * 0.88) - svgH * 0.06;
    return { label: `$${value / 1000}k`, y, yPct: (y / svgH) * 100 };
  });
})();

// ----------------------------------------------------------------------

const EarnAnimation: React.FC<{ liveApy?: number | null }> = ({ liveApy = null }) => {
  const { t } = useTranslate();
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const startRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(460);

  const displayApy = liveApy != null ? Number(liveApy).toFixed(2) : null;

  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, []);

  // Trigger animation once when scrolled into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Run animation once after scroll trigger
  useEffect(() => {
    if (!hasStarted) return;
    startRef.current = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(elapsed / CYCLE_MS, 1);
      setProgress(p);
      if (p >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [hasStarted]);

  const balance = INITIAL * Math.pow(1 + APY / 100, progress * YEARS);
  const earned = balance - INITIAL;
  const normalizedBalance = earned / (MAX_BALANCE - INITIAL);

  const dotLeft = progress * 100;
  const dotTop = (1 - (normalizedBalance * 0.88 + 0.06)) * 100;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const gradId = 'earn-area-grad';
  const lineGradId = 'earn-line-grad';
  const clipId = 'earn-progress-clip';

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        pt: '36px',
        px: '36px',
        pb: '36px',
      }}
    >

      {/* Eyebrow */}
      <Typography
        sx={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.4)',
          mb: 1,
        }}
      >
        {t('Normal Savings')}
      </Typography>

      {/* Headline */}
      <Typography
        sx={{
          fontSize: '26px',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: '#fff',
          lineHeight: 1.2,
          mb: 1,
        }}
      >
        Deposit. Earn.{' '}
        <Box
          component="span"
          sx={{
            background: 'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Compound.
        </Box>
      </Typography>

      {/* Description */}
      <Typography
        sx={{
          fontSize: '13.5px',
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.6,
          mb: 1.5,
          maxWidth: 380,
        }}
      >
        Your USDC earns {displayApy != null ? `${displayApy}%` : '~8%'} APY in audited lending pools on Stellar. Yield compounds daily — withdraw anytime, no lock-ups.
      </Typography>

      {/* Live balance */}
      <Box>
        <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', mb: 0.25 }}>
          {t('Balance')}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '2rem', md: '2.2rem' },
            fontWeight: 400,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: '"Geist Mono", ui-monospace, monospace',
            fontFeatureSettings: '"ss01","ss02","zero"',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: '#fff',
          }}
        >
          ${fmt(balance)}
        </Typography>
      </Box>

      {/* Live earnings row */}
      <Stack direction="row" alignItems="center" spacing={0.75} mt={0.75} mb={3.5}>
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: '#1AB37D',
            flexShrink: 0,
            animation: 'earnPulse 1.6s ease-in-out infinite',
            '@keyframes earnPulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.45, transform: 'scale(1.5)' },
            },
          }}
        />
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#1AB37D' }}>
          +${fmt(earned)}&nbsp;{t('earned')}
        </Typography>
      </Stack>

      {/* Sparkline — grows to fill remaining card height */}
      <Box sx={{ position: 'relative', flexGrow: 1, minHeight: 200 }}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#5BCFFF" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5BCFFF" />
              <stop offset="28%" stopColor="#6E8BFF" />
              <stop offset="55%" stopColor="#B17BFF" />
              <stop offset="78%" stopColor="#FF7BC5" />
              <stop offset="100%" stopColor="#FFB060" />
            </linearGradient>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={progress * svgW} height={svgH} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          {GRID.map(({ label, y }) => (
            <line
              key={label}
              x1={0} y1={y} x2={svgW} y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.5}
              strokeDasharray="3 5"
            />
          ))}

          {/* Ghost curve */}
          <path d={LINE_D} fill="none" stroke={BRAND_COLOR} strokeWidth={1} opacity={0.1} />


          {/* Animated line */}
          <path
            ref={pathRef}
            d={LINE_D}
            fill="none"
            stroke={`url(#${lineGradId})`}
            strokeWidth={1}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLen}
            strokeDashoffset={pathLen * (1 - progress)}
          />
        </svg>

        {/* Y-axis labels */}
        {GRID.map(({ label, yPct }) => (
          <Typography
            key={label}
            sx={{
              position: 'absolute',
              left: 0,
              top: `${yPct}%`,
              transform: 'translateY(-50%)',
              fontSize: '9px',
              color: 'rgba(255,255,255,0.25)',
              fontFamily: '"Geist Mono", ui-monospace, monospace',
              lineHeight: 1,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {label}
          </Typography>
        ))}

        {/* Moving dot — absolutely positioned to avoid SVG distortion */}
        <Box sx={{ position: 'absolute', left: `${dotLeft}%`, top: `${dotTop}%`, pointerEvents: 'none' }}>
          <Box
            sx={{
              position: 'absolute',
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: 'rgba(129,140,248,0.22)',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6E8BFF 0%, #B17BFF 100%)',
              boxShadow: '0 0 8px rgba(177,123,255,0.7)',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default EarnAnimation;

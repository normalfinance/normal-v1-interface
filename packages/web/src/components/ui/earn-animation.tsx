'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

const INITIAL = 10_000;
const APY = 15;
const YEARS = 10;
const CYCLE_MS = 6000;
const MONTHS = YEARS * 12 + 1;

const svgW = 400;
const svgH = 100;

// Pre-computed at module level (stable across renders)
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

// ----------------------------------------------------------------------

const EarnAnimation: React.FC = () => {
  const theme = useTheme();
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(460); // fallback approximation

  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setProgress((elapsed % CYCLE_MS) / CYCLE_MS);
    }, 40);
    return () => clearInterval(id);
  }, []);

  const balance = INITIAL * Math.pow(1 + APY / 100, progress * YEARS);
  const earned = balance - INITIAL;
  const normalizedBalance = earned / (MAX_BALANCE - INITIAL);

  // Dot position as CSS percentages (avoids SVG scale distortion)
  const dotLeft = progress * 100;
  const dotTop = (1 - (normalizedBalance * 0.88 + 0.06)) * 100;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const gradId = 'earn-area-grad';
  const clipId = 'earn-progress-clip';

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', p: 2.5 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11 }}
        >
          Normal Savings
        </Typography>
        <Chip
          label={`${APY}% APY`}
          size="small"
          sx={{
            bgcolor: alpha(theme.palette.success.main, 0.12),
            color: 'success.main',
            fontWeight: 700,
            fontSize: 11,
            height: 22,
          }}
        />
      </Stack>

      {/* Balance */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
          Balance
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '1.9rem', md: '2.1rem' },
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            mt: 0.25,
          }}
        >
          ${fmt(balance)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
          USDC
        </Typography>
      </Box>

      {/* Earnings */}
      <Stack direction="row" alignItems="center" spacing={0.75} mt={1.5}>
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: 'success.main',
            flexShrink: 0,
            animation: 'earnPulse 1.6s ease-in-out infinite',
            '@keyframes earnPulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.45, transform: 'scale(1.5)' },
            },
          }}
        />
        <Typography variant="caption" color="success.main" fontWeight={600} sx={{ fontSize: 12 }}>
          +${fmt(earned)}&nbsp;earned
        </Typography>
      </Stack>

      {/* Sparkline */}
      <Box sx={{ position: 'relative', mt: 'auto', mx: -2.5, mb: -2.5, height: svgH }}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={0.3} />
              <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0} />
            </linearGradient>
            {/* Clip rect that expands with progress */}
            <clipPath id={clipId}>
              <rect x={0} y={0} width={progress * svgW} height={svgH} />
            </clipPath>
          </defs>

          {/* Faint ghost curve showing where the line will go */}
          <path
            d={LINE_D}
            fill="none"
            stroke={theme.palette.success.main}
            strokeWidth={1.5}
            opacity={0.12}
          />

          {/* Area fill — revealed by clip */}
          <path d={AREA_D} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />

          {/* Animated line drawing itself via stroke-dashoffset */}
          <path
            ref={pathRef}
            d={LINE_D}
            fill="none"
            stroke={theme.palette.success.main}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLen}
            strokeDashoffset={pathLen * (1 - progress)}
          />
        </svg>

        {/* Moving dot — absolutely positioned to avoid SVG aspect-ratio distortion */}
        <Box
          sx={{
            position: 'absolute',
            left: `${dotLeft}%`,
            top: `${dotTop}%`,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.success.main, 0.22),
              transform: 'translate(-50%, -50%)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: 9,
              height: 9,
              borderRadius: '50%',
              bgcolor: 'success.main',
              boxShadow: `0 0 8px ${theme.palette.success.main}`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default EarnAnimation;

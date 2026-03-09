'use client';

import * as React from 'react';

import { fCurrency } from '@/utils/format-number';

import { Box, Stack, Typography } from '@mui/material';

export type EarnProjectionChartPoint = {
  label: string;
  value: number;
};

export type EarnProjectionChartProps = {
  points: EarnProjectionChartPoint[];
  baseline: number;
};

export function EarnProjectionChart({ points, baseline }: EarnProjectionChartProps) {
  const maxValue = Math.max(...points.map((p) => p.value), baseline || 0);
  const minValue = Math.min(...points.map((p) => p.value), baseline || 0);
  const range = Math.max(maxValue - minValue, 1);

  const chartWidth = 320;
  const chartHeight = 170;
  const leftPad = 58;
  const rightPad = 8;
  const topPad = 10;
  const bottomPad = 28;
  const innerWidth = chartWidth - leftPad - rightPad;
  const innerHeight = chartHeight - topPad - bottomPad;

  const coords = points.map((point, idx) => {
    const x = leftPad + (idx * innerWidth) / Math.max(points.length - 1, 1);
    const y = topPad + (1 - (point.value - minValue) / range) * innerHeight;
    return { ...point, x, y };
  });

  const linePath = coords
    .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? leftPad} ${
    topPad + innerHeight
  } L ${coords[0]?.x ?? leftPad} ${topPad + innerHeight} Z`;

  return (
    <Stack spacing={1.5}>
      {/* Y labels */}
      <Stack direction="row" justifyContent="space-between" sx={{ px: 0.5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {fCurrency(maxValue)}
        </Typography>
        <Box />
      </Stack>

      {/* Chart canvas */}
      <Box sx={{ position: 'relative', width: '100%', height: chartHeight }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <path d={areaPath} fill="rgba(32, 227, 162, 0.10)" />
          <path d={linePath} fill="none" stroke="#20E3A2" strokeWidth="2.5" />
        </svg>

        <Typography
          variant="body2"
          sx={{
            position: 'absolute',
            left: 0,
            bottom: bottomPad - 4,
            color: 'text.secondary',
          }}
        >
          {fCurrency(baseline)}
        </Typography>
      </Box>

      {/* X labels */}
      <Stack direction="row" justifyContent="space-between" sx={{ pl: 7 }}>
        {points.map((point) => (
          <Typography key={point.label} variant="body2" sx={{ color: 'text.secondary' }}>
            {point.label}
          </Typography>
        ))}
      </Stack>
    </Stack>
  );
}
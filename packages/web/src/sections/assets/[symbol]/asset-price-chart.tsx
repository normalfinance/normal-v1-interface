'use client';

import type { PriceRange } from '@/hooks/use-price-history';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { MONO, CARD_SX } from '@/sections/portfolio/_shared';
import { usePriceHistory, PRICE_HISTORY_SYMBOLS } from '@/hooks/use-price-history';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

import { Chart, useChart } from '@/components/template/chart';

// ---------------------------------------------------------------------------

const RANGES: { value: PriceRange; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
  { value: 'all', label: 'All' },
];

const UP_COLOR = '#1AB37D';
const DOWN_COLOR = '#DC2626';

function formatPrice(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: value >= 1 ? 2 : 4,
  })}`;
}

export function AssetPriceChart({ symbol }: { symbol: string }) {
  const { t } = useTranslate();
  const [range, setRange] = useState<PriceRange>('1w');

  const supported = PRICE_HISTORY_SYMBOLS.includes(symbol);
  const { prices, isLoading, error } = usePriceHistory(symbol, range, supported);

  const firstPrice = prices.length ? prices[0][1] : 0;
  const lastPrice = prices.length ? prices[prices.length - 1][1] : 0;
  const change = lastPrice - firstPrice;
  const changePct = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
  const isUp = change >= 0;
  const color = isUp ? UP_COLOR : DOWN_COLOR;

  const chartOptions = useChart({
    colors: [color],
    stroke: { width: 2.5, curve: 'smooth' },
    dataLabels: { enabled: false },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.22, opacityTo: 0, shadeIntensity: 0 },
    },
    grid: {
      strokeDashArray: 3,
      borderColor: 'rgba(10,10,15,0.06)',
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      type: 'datetime',
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { datetimeUTC: false, style: { fontSize: '11px' } },
      tooltip: { enabled: false },
    },
    yaxis: {
      opposite: true,
      tickAmount: 4,
      labels: {
        style: { fontSize: '11px' },
        formatter: (value: number) => formatPrice(value),
      },
    },
    tooltip: {
      x: { format: 'dd MMM yyyy, HH:mm' },
      y: {
        formatter: (value: number) => formatPrice(value),
        title: { formatter: () => '' },
      },
    },
  });

  if (!supported) return null;

  return (
    <Box sx={{ ...CARD_SX, mt: '20px', minWidth: 0 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          mb: '18px',
        }}
      >
        <Box>
          <Box sx={{ fontSize: '15px', fontWeight: 500, color: '#0A0A0F', mb: '8px' }}>
            {t('Price')}
          </Box>
          {isLoading ? (
            <Skeleton variant="text" width={160} sx={{ fontSize: '24px' }} />
          ) : prices.length > 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <Box sx={{ ...MONO, fontSize: '24px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.02em' }}>
                {formatPrice(lastPrice)}
              </Box>
              <Box sx={{ ...MONO, fontSize: '13px', fontWeight: 500, color }}>
                {isUp ? '+' : ''}{changePct.toFixed(2)}%
              </Box>
            </Box>
          ) : null}
        </Box>

        {/* Range tabs */}
        <Box
          sx={{
            display: 'inline-flex',
            bgcolor: 'rgba(10,10,15,0.04)',
            borderRadius: '999px',
            p: '4px',
            gap: '2px',
          }}
        >
          {RANGES.map((item) => (
            <Box
              key={item.value}
              component="button"
              onClick={() => setRange(item.value)}
              sx={{
                px: '14px',
                py: '6px',
                borderRadius: '999px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 150ms, color 150ms',
                bgcolor: range === item.value ? '#fff' : 'transparent',
                color: range === item.value ? '#0A0A0F' : 'rgba(10,10,15,0.45)',
                boxShadow: range === item.value ? '0 1px 2px rgba(10,10,15,0.08)' : 'none',
              }}
            >
              {item.label}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Chart */}
      {error ? (
        <Box sx={{ color: 'rgba(10,10,15,0.4)', fontSize: '14px', py: '48px', textAlign: 'center' }}>
          {t('Price data is unavailable right now. Please try again later.')}
        </Box>
      ) : isLoading ? (
        <Skeleton variant="rectangular" height={280} sx={{ borderRadius: '12px' }} />
      ) : (
        <Chart
          type="area"
          series={[{ name: symbol, data: prices }]}
          options={chartOptions}
          sx={{ height: 280 }}
        />
      )}
    </Box>
  );
}

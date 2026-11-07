'use client';

import type { PriceRange } from '@/hooks/use-price-history';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { PALETTE } from '@/theme/brand-colors';
import { usePriceHistory, PRICE_HISTORY_SYMBOLS } from '@/hooks/use-price-history';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

import { Chart, useChart } from '@/components/template/chart';
import { SegmentedControl } from '@/components/_common/brand';
import { Change, FIGURES, AppBlock } from '@/components/_common/app-ui';

// ---------------------------------------------------------------------------

const RANGES: { value: PriceRange; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
  { value: 'all', label: 'All' },
];

// The line is ink, in plain hex (the chart's SVG can't read CSS variables):
// up or down is said once, by the change beside the price, in Change's colours.
const LINE_COLOR = PALETTE.light.ink;

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
  const { prices, isLoading, isValidating, error } = usePriceHistory(symbol, range, supported);
  // "Unavailable" is a TERMINAL claim — only make it once retries are done.
  // A cold upstream often fails the first call and succeeds on retry; showing
  // the error mid-retry told users data was unavailable that arrived seconds
  // later (observed live 2026-08-18). While retrying, keep the skeleton.
  const stillLoading = isLoading || (!!error && isValidating);
  const failed = !!error && !isValidating && prices.length === 0;

  const firstPrice = prices.length ? prices[0][1] : 0;
  const lastPrice = prices.length ? prices[prices.length - 1][1] : 0;
  const change = lastPrice - firstPrice;
  const changePct = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
  const chartOptions = useChart({
    colors: [LINE_COLOR],
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    // Flat, like everything else: a faint solid area under the line.
    fill: { type: 'solid', opacity: 0.04 },
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
    <AppBlock
      title={t('Price')}
      action={<SegmentedControl value={range} onChange={setRange} options={RANGES} />}
    >
      <Box sx={{ mb: '18px' }}>
        <Box>
          {isLoading ? (
            <Skeleton variant="text" width={160} sx={{ fontSize: '24px' }} />
          ) : prices.length > 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <Box
                sx={{
                  ...FIGURES,
                  fontSize: 28,
                  fontWeight: 500,
                  color: 'text.primary',
                  letterSpacing: '-0.03em',
                }}
              >
                {formatPrice(lastPrice)}
              </Box>
              <Change pct={changePct} sx={{ fontSize: 14, fontWeight: 500 }} />
            </Box>
          ) : null}
        </Box>
      </Box>

      {/* Chart */}
      {failed ? (
        <Box sx={{ color: 'text.secondary', fontSize: 14, py: 6, textAlign: 'center' }}>
          {t('Price data is unavailable right now. Please try again later.')}
        </Box>
      ) : stillLoading && prices.length === 0 ? (
        <Skeleton variant="rectangular" height={280} />
      ) : (
        <Chart
          type="area"
          series={[{ name: symbol, data: prices }]}
          options={chartOptions}
          sx={{ height: 280 }}
        />
      )}
    </AppBlock>
  );
}

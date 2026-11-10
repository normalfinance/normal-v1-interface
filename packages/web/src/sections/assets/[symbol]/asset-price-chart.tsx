'use client';

import type { PriceRange } from '@/hooks/use-price-history';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { minSpanFor } from '@/lib/prices/markets';
import { assetColor } from '@/lib/portfolio/display';
import { INK, MUTED, BRAND_COLORS } from '@/theme/brand-colors';
import { usePriceHistory, PRICE_HISTORY_SYMBOLS } from '@/hooks/use-price-history';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { HistoryChart } from '@/components/_common/history-chart';
import { FIGURES, formatPrice } from '@/components/_common/app-ui';

// ---------------------------------------------------------------------------

/**
 * The asset's price over a chosen range, in the coin's own colour
 * (HistoryChart draws it). The figures above the line: the price at the point
 * being read, else the latest, and how far it moved since the range opened.
 */
export function AssetPriceChart({ symbol }: { symbol: string }) {
  const { t } = useTranslate();
  const [range, setRange] = useState<PriceRange>('1w');

  const supported = PRICE_HISTORY_SYMBOLS.includes(symbol);
  const { prices, isLoading, isValidating, error } = usePriceHistory(symbol, range, supported);
  // "Unavailable" is a TERMINAL claim: only make it once retries are done.
  // A cold upstream often fails the first call and succeeds on retry; showing
  // the error mid-retry told users data was unavailable that arrived seconds
  // later (observed live 2026-08-18). While retrying, keep the skeleton.
  const stillLoading = isLoading || (!!error && isValidating);
  const failed = !!error && !isValidating && prices.length === 0;

  if (!supported) return null;

  return (
    <HistoryChart
      title={t('Price')}
      points={prices}
      range={range}
      onRangeChange={setRange}
      color={assetColor(symbol)}
      minSpan={minSpanFor(symbol)}
      loading={stillLoading}
      failed={failed}
      valueLabel={(value) => formatPrice(value)}
      ariaLabel={t(
        'Price chart. Use the left and right arrow keys to read the price at each point.'
      )}
      failedText={t('Price data is unavailable right now. Please try again later.')}
      figures={({ shown, first, when }) => {
        const change = shown - first;
        const changePct = first > 0 ? (change / first) * 100 : 0;
        const up = change > 0;
        const sign = up ? '+' : change < 0 ? '−' : '';
        return (
          <>
            <Typography
              sx={{
                ...FIGURES,
                fontSize: { xs: 28, md: 32 },
                fontWeight: 500,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: INK,
              }}
            >
              {formatPrice(shown)}
            </Typography>
            <Typography sx={{ ...FIGURES, mt: 0.75, fontSize: 14, color: MUTED }}>
              <Box
                component="span"
                sx={{ color: up ? BRAND_COLORS.mint.deep : MUTED, fontWeight: 500 }}
              >
                {`${sign}${formatPrice(Math.abs(change))} (${sign}${Math.abs(changePct).toFixed(2)}%)`}
              </Box>{' '}
              {when}
            </Typography>
          </>
        );
      }}
    />
  );
}

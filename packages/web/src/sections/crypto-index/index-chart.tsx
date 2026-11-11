'use client';

import type { IndexMeta } from '@/lib/index/indexes';
import type { PriceRange } from '@/hooks/use-price-history';

import { useTranslate } from '@/locales';
import { useMemo, useState } from 'react';
import { INK, MUTED } from '@/theme/brand-colors';
import { minSpanFor } from '@/lib/prices/markets';
import { basketHistory } from '@/lib/index/indexes';
import { WeightBar } from '@/sections/indexes/index-parts';
import { useIndexWeights } from '@/hooks/use-index-weights';
import { usePriceHistories } from '@/hooks/use-price-history';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { BOX_PX, Change, FIGURES } from '@/components/_common/app-ui';
import { HistoryChart, HISTORY_RANGES } from '@/components/_common/history-chart';

// ---------------------------------------------------------------------------
// The index over a chosen range (Niko 2026-11-10: "different graphs not just
// 24h"): its coins' combined market size from the range's start, in ink, the
// same chart a coin's page draws (HistoryChart), its scale in how far it moved
// since the range opened (0% on the opening's dashed line). Under it, its
// shares by market size. "All" is left out: its coins' histories begin years
// apart, so "all time" would only mean "since the youngest coin".
// ---------------------------------------------------------------------------

const INDEX_RANGES = HISTORY_RANGES.filter((r) => r.value !== 'all');

/** How far the index moved from the range's start, in percent. */
const movedPct = (value: number, first: number) => (first > 0 ? (value / first - 1) * 100 : 0);

const signedPct = (pct: number) =>
  `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(2)}%`;

export function IndexChart({ meta }: { meta: IndexMeta }) {
  const { t } = useTranslate();
  const [range, setRange] = useState<PriceRange>('1w');
  const { weights, markets, error: marketsError } = useIndexWeights(meta.def);
  const { histories, isValidating, error } = usePriceHistories(meta.def.coins, range);

  const points = useMemo(
    () =>
      histories
        ? basketHistory(
            meta.def,
            (symbol) => markets[symbol],
            (s) => histories[s]
          )
        : [],
    [histories, markets, meta.def]
  );
  // The line needs every coin's prices and today's market sizes. Until it has
  // them (retries included) it is loading; "unavailable" is said only once the
  // reads are done and there is still nothing to draw.
  const marketsIn = meta.def.coins.every((symbol) => !!markets[symbol]);
  const failed =
    !points.length &&
    ((!!error && !isValidating) ||
      (marketsError && !marketsIn) ||
      (!!histories && marketsIn && !isValidating));

  return (
    <HistoryChart
      title={t('Performance')}
      points={points}
      range={range}
      onRangeChange={setRange}
      ranges={INDEX_RANGES}
      color={INK}
      minSpan={minSpanFor(meta.def.coins[0])}
      loading={!points.length && !failed}
      failed={failed}
      valueLabel={(value, first) => signedPct(movedPct(value, first))}
      axis="change"
      ariaLabel={t(
        '{{name}} chart. Use the left and right arrow keys to read how it moved at each point.',
        { name: meta.name }
      )}
      failedText={t('Market data is unavailable right now. Please try again later.')}
      figures={({ shown, first, when }) => (
        <>
          <Typography
            component="div"
            sx={{
              ...FIGURES,
              fontSize: { xs: 28, md: 32 },
              fontWeight: 500,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
            }}
          >
            <Change pct={movedPct(shown, first)} />
          </Typography>
          <Typography sx={{ mt: 0.75, fontSize: 14, color: MUTED }}>
            {t('{{name}} by market size, {{when}}', { name: meta.name, when })}
          </Typography>
        </>
      )}
      footer={
        <Box sx={{ px: BOX_PX, pt: 3, pb: { xs: 2.5, md: 3 } }}>
          <WeightBar weights={weights} height={8} />
          <Typography sx={{ mt: 1.5, fontSize: 12.5, color: MUTED }}>
            {t('Market sizes from CoinGecko')}
          </Typography>
        </Box>
      }
    />
  );
}

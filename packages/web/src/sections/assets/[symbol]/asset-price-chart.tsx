'use client';

import type { PointerEvent, KeyboardEvent } from 'react';
import type { PriceRange } from '@/hooks/use-price-history';

import { useTranslate } from '@/locales';
import { useMemo, useState, useEffect } from 'react';
import { assetColor } from '@/lib/portfolio/display';
import { minSpanFor, priceDomain } from '@/lib/prices/markets';
import { usePriceHistory, PRICE_HISTORY_SYMBOLS } from '@/hooks/use-price-history';
import { INK, MUTED, PAPER, BRAND_COLORS, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { SegmentedControl, VISUALLY_HIDDEN_SX } from '@/components/_common/brand';
import { BOX_PX, FIGURES, AppBlock, appLocale, formatPrice } from '@/components/_common/app-ui';

// ---------------------------------------------------------------------------

const RANGES: { value: PriceRange; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
  { value: 'all', label: 'All' },
];

const RANGE_WORDS: Record<PriceRange, string> = {
  '1d': 'past 24 hours',
  '1w': 'past week',
  '1m': 'past month',
  '1y': 'past year',
  '5y': 'past 5 years',
  all: 'all time',
};

// The line is drawn in a 1000 × 1000 box stretched to the chart, so a point's
// place is a percentage both ways and the labels laid over it (HTML, so text
// never stretches) use the same numbers. Room is kept above and below the
// line for the high and low labels.
const VIEW = 1000;
const TOP_ROOM = 14; // percent of the height
const BOTTOM_ROOM = 13;

const pct = (n: number) => `${n.toFixed(3)}%`;

function dateLabel(ts: number, range: PriceRange) {
  const long = range === '1y' || range === '5y' || range === 'all';
  return new Date(ts).toLocaleString(
    appLocale(),
    long
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
  );
}

/** "High $89,120.55" by the top of the line, kept inside the chart's edges. */
function ExtremeLabel({
  kind,
  x,
  y,
  value,
}: {
  kind: 'High' | 'Low';
  x: number;
  y: number;
  value: number;
}) {
  const edge = x < 12 ? 'start' : x > 88 ? 'end' : 'middle';
  return (
    <Typography
      aria-hidden="true"
      sx={{
        ...FIGURES,
        position: 'absolute',
        top: kind === 'High' ? `calc(${pct(y)} - 24px)` : `calc(${pct(y)} + 8px)`,
        ...(edge === 'end' ? { right: '12px' } : { left: edge === 'start' ? '12px' : pct(x) }),
        transform: edge === 'middle' ? 'translateX(-50%)' : 'none',
        fontSize: 12,
        lineHeight: '16px',
        color: MUTED,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      {`${kind} ${formatPrice(value)}`}
    </Typography>
  );
}

/**
 * The asset's price over a chosen range, drawn edge to edge in the coin's own
 * colour over a faint wash, with a dashed line at the range's opening price.
 * Pointing at the line (or dragging a finger, or the arrow keys) reads the
 * price at that moment into the figures above it.
 */
export function AssetPriceChart({ symbol }: { symbol: string }) {
  const { t } = useTranslate();
  const [range, setRange] = useState<PriceRange>('1w');
  const [active, setActive] = useState<number | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);

  const supported = PRICE_HISTORY_SYMBOLS.includes(symbol);
  const { prices, isLoading, isValidating, error } = usePriceHistory(symbol, range, supported);
  // "Unavailable" is a TERMINAL claim: only make it once retries are done.
  // A cold upstream often fails the first call and succeeds on retry; showing
  // the error mid-retry told users data was unavailable that arrived seconds
  // later (observed live 2026-08-18). While retrying, keep the skeleton.
  const stillLoading = isLoading || (!!error && isValidating);
  const failed = !!error && !isValidating && prices.length === 0;

  const color = assetColor(symbol);

  const chart = useMemo(() => {
    const values = prices.map(([, v]) => v);
    if (values.length < 2) return null;
    const { min, max } = priceDomain(values, minSpanFor(symbol));
    const x = (i: number) => (i / (values.length - 1)) * 100;
    const y = (v: number) => TOP_ROOM + ((max - v) / (max - min)) * (100 - TOP_ROOM - BOTTOM_ROOM);
    const line = values
      .map(
        (v, i) =>
          `${i ? 'L' : 'M'}${((x(i) * VIEW) / 100).toFixed(1)} ${((y(v) * VIEW) / 100).toFixed(1)}`
      )
      .join(' ');
    const hi = values.indexOf(Math.max(...values));
    const lo = values.indexOf(Math.min(...values));
    // A coin that hardly moved (a digital dollar) draws flat; marking its
    // "high" and "low" a hundredth of a cent apart would only be noise.
    const flat = values[hi] - values[lo] < Math.abs(values[values.length - 1]) * 0.01;
    return { values, x, y, line, area: `${line} L${VIEW} ${VIEW} L0 ${VIEW} Z`, hi, lo, flat };
  }, [prices, symbol]);

  // A new range is a new line: forget the point being read.
  useEffect(() => setActive(null), [range]);

  if (!supported) return null;

  const count = chart?.values.length ?? 0;
  const index = active !== null && active < count ? active : null;
  const first = chart ? chart.values[0] : 0;
  const shown = chart ? chart.values[index ?? count - 1] : 0;
  const change = shown - first;
  const changePct = first > 0 ? (change / first) * 100 : 0;
  const up = change > 0;

  const indexAt = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return Math.round(ratio * (count - 1));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!count) return;
    const step = event.shiftKey ? Math.max(1, Math.round(count / 10)) : 1;
    const at = index ?? count - 1;
    const next =
      event.key === 'ArrowLeft'
        ? Math.max(0, at - step)
        : event.key === 'ArrowRight'
          ? Math.min(count - 1, at + step)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? count - 1
              : event.key === 'Escape'
                ? null
                : undefined;
    if (next === undefined) return;
    event.preventDefault();
    setByKeyboard(true);
    setActive(next);
  };

  const when = index !== null ? dateLabel(prices[index][0], range) : t(RANGE_WORDS[range]);

  return (
    <AppBlock
      flush
      title={t('Price')}
      action={<SegmentedControl value={range} onChange={setRange} options={RANGES} />}
    >
      {/* The figures: the price at the point being read, else the latest */}
      <Box sx={{ px: BOX_PX, pt: { xs: '20px', md: '24px' }, pb: 0.5, minHeight: 92 }}>
        {stillLoading && !chart ? (
          <>
            <Skeleton variant="text" width={180} sx={{ fontSize: 32 }} />
            <Skeleton variant="text" width={220} />
          </>
        ) : chart ? (
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
                {`${up ? '+' : change < 0 ? '−' : ''}${formatPrice(Math.abs(change))} (${up ? '+' : change < 0 ? '−' : ''}${Math.abs(changePct).toFixed(2)}%)`}
              </Box>{' '}
              {when}
            </Typography>
          </>
        ) : null}
      </Box>

      {failed ? (
        <Typography sx={{ px: BOX_PX, py: 8, fontSize: 14, textAlign: 'center', color: MUTED }}>
          {t('Price data is unavailable right now. Please try again later.')}
        </Typography>
      ) : !chart ? (
        <Skeleton variant="rectangular" sx={{ height: { xs: 200, md: 280 } }} />
      ) : (
        <Box
          role="group"
          tabIndex={0}
          aria-label={t(
            'Price chart. Use the left and right arrow keys to read the price at each point.'
          )}
          onPointerDown={(event) => {
            setByKeyboard(false);
            setActive(indexAt(event));
          }}
          onPointerMove={(event) => {
            if (event.pointerType === 'mouse' || event.buttons) {
              setByKeyboard(false);
              setActive(indexAt(event));
            }
          }}
          onPointerLeave={() => setActive(null)}
          onPointerUp={(event) => event.pointerType !== 'mouse' && setActive(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          sx={{
            position: 'relative',
            height: { xs: 200, md: 280 },
            cursor: 'crosshair',
            // Fingers scroll the page up and down, and read the line sideways.
            touchAction: 'pan-y',
            outline: 'none',
            '&:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: -2 },
          }}
        >
          {/* Where the range opened */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: pct(chart.y(chart.values[0])),
              borderTop: `1px dashed ${HAIRLINE_STRONG}`,
            }}
          />

          <svg
            aria-hidden="true"
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            preserveAspectRatio="none"
            width="100%"
            height="100%"
            style={{ position: 'absolute', inset: 0, display: 'block' }}
          >
            <path d={chart.area} fill={color} fillOpacity={0.07} />
            <path
              d={chart.line}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {!chart.flat && (
            <>
              <ExtremeLabel
                kind="High"
                x={chart.x(chart.hi)}
                y={chart.y(chart.values[chart.hi])}
                value={chart.values[chart.hi]}
              />
              <ExtremeLabel
                kind="Low"
                x={chart.x(chart.lo)}
                y={chart.y(chart.values[chart.lo])}
                value={chart.values[chart.lo]}
              />
            </>
          )}

          {/* The point being read: a hairline down the chart */}
          {index !== null && (
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: pct(chart.x(index)),
                borderLeft: `1px solid ${HAIRLINE_STRONG}`,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* A dot on the point being read, else on now, the line's end.
              Kept inside the chart's edges, where the line starts and ends. */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              left: `clamp(6px, ${pct(chart.x(index ?? count - 1))}, calc(100% - 6px))`,
              top: pct(chart.y(chart.values[index ?? count - 1])),
              width: 11,
              height: 11,
              ml: '-5.5px',
              mt: '-5.5px',
              borderRadius: '50%',
              bgcolor: color,
              border: `2px solid ${PAPER}`,
              pointerEvents: 'none',
            }}
          />

          {/* Read out by screen readers when the arrow keys move the point */}
          <Box aria-live="polite" sx={VISUALLY_HIDDEN_SX}>
            {byKeyboard && index !== null
              ? `${formatPrice(chart.values[index])}, ${dateLabel(prices[index][0], range)}`
              : ''}
          </Box>
        </Box>
      )}
    </AppBlock>
  );
}

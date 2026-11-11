'use client';

import type { AxisKind } from '@/lib/charts/axis';
import type { PriceRange } from '@/hooks/use-price-history';
import type { ReactNode, PointerEvent, KeyboardEvent } from 'react';

import { useTranslate } from '@/locales';
import { axisTicks } from '@/lib/charts/axis';
import { priceDomain } from '@/lib/prices/markets';
import { useMemo, useState, useEffect } from 'react';
import { INK, MUTED, PAPER, HAIRLINE_COLOR, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { SegmentedControl, VISUALLY_HIDDEN_SX } from '@/components/_common/brand';
import { BOX_PX, FIGURES, AppBlock, appLocale } from '@/components/_common/app-ui';

// ---------------------------------------------------------------------------
// A line over a chosen range, the app's one way of drawing history: a coin's
// price on its page, an index's value on its own (Niko 2026-11-10: "the
// indexes subpage should also show different graphs"). Drawn from the left
// edge to its scale in one colour over a faint wash, with a dashed line at the
// range's opening value and its high and low marked. The scale on the right
// holds a few round values with a hairline across for each (Niko 2026-11-10:
// "why does no graph have y axis values"; lib/charts/axis.ts). Pointing at the
// line (or dragging a finger, or the arrow keys) reads the value at that
// moment into the figures above it; what the figures say is the caller's
// (`figures`).
// ---------------------------------------------------------------------------

export const HISTORY_RANGES: { value: PriceRange; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
  { value: 'all', label: 'All' },
];

export const RANGE_WORDS: Record<PriceRange, string> = {
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

/** A value on the scale: small, muted figures that line up. */
const TICK_SX = {
  ...FIGURES,
  fontSize: 12,
  lineHeight: '16px',
  color: MUTED,
  whiteSpace: 'nowrap',
} as const;

/**
 * Five values crowd a phone's shorter chart: there every other one shows (the
 * first, middle and last), so the step doubles and the scale stays round.
 */
const tickDisplay = (i: number, count: number) =>
  count === 5 && i % 2 ? { xs: 'none', md: 'block' } : 'block';

export function historyDateLabel(ts: number, range: PriceRange) {
  const long = range === '1y' || range === '5y' || range === 'all';
  return new Date(ts).toLocaleString(
    appLocale(),
    long
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
  );
}

/** "High $89,120.55" by the top of the line, kept inside the chart's edges. */
function ExtremeLabel({ text, x, y, high }: { text: string; x: number; y: number; high: boolean }) {
  const edge = x < 12 ? 'start' : x > 88 ? 'end' : 'middle';
  return (
    <Typography
      aria-hidden="true"
      sx={{
        ...FIGURES,
        position: 'absolute',
        top: high ? `calc(${pct(y)} - 24px)` : `calc(${pct(y)} + 8px)`,
        ...(edge === 'end' ? { right: '12px' } : { left: edge === 'start' ? '12px' : pct(x) }),
        transform: edge === 'middle' ? 'translateX(-50%)' : 'none',
        fontSize: 12,
        lineHeight: '16px',
        color: MUTED,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      {text}
    </Typography>
  );
}

export interface HistoryReading {
  /** The value at the point being read, else the latest. */
  shown: number;
  /** The range's opening value. */
  first: number;
  /** When that is: the moment being read, else the range in words ("past week"). */
  when: string;
}

export interface HistoryChartProps {
  /** The block's title: "Price". */
  title: string;
  /** [time in ms, value], oldest first. */
  points: [number, number][];
  range: PriceRange;
  onRangeChange: (range: PriceRange) => void;
  ranges?: { value: PriceRange; label: string }[];
  color: string;
  /** The least range the line spans, as a share of its value (minSpanFor). */
  minSpan: number;
  /** Still loading (retries included): the skeleton, never "unavailable". */
  loading: boolean;
  /** Retries are done and there is nothing to draw. */
  failed: boolean;
  /** The figures above the line, for the point being read. */
  figures: (reading: HistoryReading) => ReactNode;
  /** A value in words, for the high and low labels ("$89,120.55", "+4.10%"). */
  valueLabel: (value: number, first: number) => string;
  /** How the scale reads: dollars (a price, the default), or the move since the range opened. */
  axis?: AxisKind;
  /** The chart's name for screen readers. */
  ariaLabel: string;
  failedText: string;
  /** Under the line, inside the block (an index's shares). */
  footer?: ReactNode;
}

export function HistoryChart({
  title,
  points,
  range,
  onRangeChange,
  ranges = HISTORY_RANGES,
  color,
  minSpan,
  loading,
  failed,
  figures,
  valueLabel,
  axis = 'usd',
  ariaLabel,
  failedText,
  footer,
}: HistoryChartProps) {
  const { t } = useTranslate();
  const [active, setActive] = useState<number | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);

  const chart = useMemo(() => {
    const values = points.map(([, v]) => v);
    if (values.length < 2) return null;
    const { min, max } = priceDomain(values, minSpan);
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
    // A line that hardly moved (a digital dollar) draws flat; marking its
    // "high" and "low" a hundredth of a cent apart would only be noise.
    const flat = values[hi] - values[lo] < Math.abs(values[values.length - 1]) * 0.01;
    // The scale spans the line's own high to low, so its values never meet
    // the high and low labels just outside them; a flat line, which has no
    // such labels, takes its whole height. About four values on a full
    // height, fewer when the line fills less of it.
    const [from, to] = flat ? [min, max] : [values[lo], values[hi]];
    const filled = (y(from) - y(to)) / (100 - TOP_ROOM - BOTTOM_ROOM);
    const ticks = axisTicks({
      lo: from,
      hi: to,
      first: values[0],
      kind: axis,
      target: Math.max(2, Math.min(4, Math.round(filled * 4))),
      locale: appLocale(),
    }).map((tick) => ({
      ...tick,
      y: y(tick.value),
      // On the opening's dashed line (an index's 0%): that line stands for it.
      onOpening: Math.abs(y(tick.value) - y(values[0])) < 0.75,
    }));
    return {
      values,
      x,
      y,
      line,
      area: `${line} L${VIEW} ${VIEW} L0 ${VIEW} Z`,
      hi,
      lo,
      flat,
      ticks,
    };
  }, [points, minSpan, axis]);

  // A new range is a new line: forget the point being read.
  useEffect(() => setActive(null), [range]);

  const count = chart?.values.length ?? 0;
  const index = active !== null && active < count ? active : null;
  const first = chart ? chart.values[0] : 0;
  const shown = chart ? chart.values[index ?? count - 1] : 0;

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

  const when = index !== null ? historyDateLabel(points[index][0], range) : t(RANGE_WORDS[range]);

  return (
    <AppBlock
      flush
      title={title}
      action={<SegmentedControl value={range} onChange={onRangeChange} options={ranges} />}
    >
      {/* The figures: the value at the point being read, else the latest */}
      <Box sx={{ px: BOX_PX, pt: { xs: '20px', md: '24px' }, pb: 0.5, minHeight: 92 }}>
        {loading && !chart ? (
          <>
            <Skeleton variant="text" width={180} sx={{ fontSize: 32 }} />
            <Skeleton variant="text" width={220} />
          </>
        ) : chart ? (
          figures({ shown, first, when })
        ) : null}
      </Box>

      {failed ? (
        <Typography sx={{ px: BOX_PX, py: 8, fontSize: 14, textAlign: 'center', color: MUTED }}>
          {failedText}
        </Typography>
      ) : !chart ? (
        <Skeleton variant="rectangular" sx={{ height: { xs: 200, md: 280 } }} />
      ) : (
        <Box
          role="group"
          tabIndex={0}
          aria-label={ariaLabel}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          sx={{
            display: 'flex',
            height: { xs: 200, md: 280 },
            outline: 'none',
            '&:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: -2 },
          }}
        >
          {/* The line: pointing anywhere on it reads the moment under it */}
          <Box
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
            sx={{
              position: 'relative',
              flex: '1 1 auto',
              minWidth: 0,
              cursor: 'crosshair',
              // Fingers scroll the page up and down, and read the line sideways.
              touchAction: 'pan-y',
            }}
          >
            {/* The scale's hairlines across, under everything */}
            {chart.ticks.map((tick, i) =>
              tick.onOpening ? null : (
                <Box
                  key={tick.value}
                  aria-hidden="true"
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: pct(tick.y),
                    borderTop: `1px solid ${HAIRLINE_COLOR}`,
                    display: tickDisplay(i, chart.ticks.length),
                  }}
                />
              )
            )}

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
                  high
                  text={`${t('High')} ${valueLabel(chart.values[chart.hi], first)}`}
                  x={chart.x(chart.hi)}
                  y={chart.y(chart.values[chart.hi])}
                />
                <ExtremeLabel
                  high={false}
                  text={`${t('Low')} ${valueLabel(chart.values[chart.lo], first)}`}
                  x={chart.x(chart.lo)}
                  y={chart.y(chart.values[chart.lo])}
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
              Kept inside the page's edge where the line starts; at its end
              it sits on the line's last point, in the room before the scale. */}
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                left: `max(6px, ${pct(chart.x(index ?? count - 1))})`,
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
                ? `${valueLabel(chart.values[index], first)}, ${historyDateLabel(points[index][0], range)}`
                : ''}
            </Box>
          </Box>

          {/* The scale: each value beside its hairline, the column as wide as
              its widest value and ending where the page does */}
          <Box aria-hidden="true" sx={{ position: 'relative', flex: 'none', pl: 1.5, pr: BOX_PX }}>
            <Box sx={{ height: 0, overflow: 'hidden', visibility: 'hidden' }}>
              {chart.ticks.map((tick) => (
                <Typography key={tick.value} sx={TICK_SX}>
                  {tick.label}
                </Typography>
              ))}
            </Box>
            {chart.ticks.map((tick, i) => (
              <Typography
                key={tick.value}
                sx={{
                  ...TICK_SX,
                  position: 'absolute',
                  right: BOX_PX,
                  top: pct(tick.y),
                  transform: 'translateY(-50%)',
                  display: tickDisplay(i, chart.ticks.length),
                }}
              >
                {tick.label}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {footer}
    </AppBlock>
  );
}

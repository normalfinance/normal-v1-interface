'use client';

import { useMemo, useState } from 'react';
import { useSavingsHistory } from '@/hooks/use-savings-history';
import { INK, HOVER, MUTED, CANVAS } from '@/theme/brand-colors';
import { buildRealEarningsHistory } from '@/lib/savings/earnings-history';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

type TimeFilter = '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';

const TIME_FILTERS: TimeFilter[] = ['1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'];
const WINDOW_MS: Record<TimeFilter, number | null> = {
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
  '3M': 90 * 24 * 60 * 60 * 1000,
  '6M': 180 * 24 * 60 * 60 * 1000,
  '1Y': 365 * 24 * 60 * 60 * 1000,
  '5Y': 5 * 365 * 24 * 60 * 60 * 1000,
  ALL: null,
};

const CHART_W = 800;
const CHART_H = 220;
const NUM_POINTS = 80;

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmtY(v: number): string {
  if (v <= 0) return '$0';
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(3)}`;
  if (v >= 0.001) return `$${v.toFixed(5)}`;
  return `$${v.toFixed(6)}`;
}

function fmtStat(v: number): string {
  if (v <= 0) return '$0.00000';
  // Cents from a cent up; below that, enough digits to show it growing.
  if (v >= 0.01) return `$${v.toFixed(2)}`;
  if (v >= 0.00001) return `$${v.toFixed(5)}`;
  return '<$0.00001';
}

function fmtDate(t: number, now: number): string {
  const diff = now - t;
  if (diff < 7 * 24 * 3600 * 1000) {
    return new Date(t).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  if (diff < 365 * 24 * 3600 * 1000) {
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Data helpers ──────────────────────────────────────────────────────────────

interface ChartPoint {
  t: number;
  v: number;
}

function filterByWindow(points: ChartPoint[], filter: TimeFilter, now: number): ChartPoint[] {
  const windowMs = WINDOW_MS[filter];
  if (!windowMs || points.length === 0) return points;

  const cutoff = now - windowMs;
  const after = points.filter((p) => p.t >= cutoff);
  const before = points.filter((p) => p.t < cutoff);
  const startV = before.length > 0 ? before[before.length - 1].v : 0;

  if (after.length === 0)
    return [
      { t: cutoff, v: startV },
      { t: now, v: startV },
    ];
  return [{ t: cutoff, v: startV }, ...after];
}

function getPeriodEarnings(points: ChartPoint[], windowMs: number, now: number): number {
  if (points.length === 0) return 0;
  const atNow = points[points.length - 1].v;
  const cutoff = now - windowMs;
  const before = points.filter((p) => p.t <= cutoff);
  if (before.length === 0) return atNow;
  return Math.max(0, atNow - before[before.length - 1].v);
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface SavingsChartProps {
  walletAddress?: string;
  currentEarnings: number;
  currentBalance?: number;
}

export function SavingsChart({ walletAddress, currentEarnings }: SavingsChartProps) {
  const [filter, setFilter] = useState<TimeFilter>('1W');
  // #53: REAL history — the DeFindex events this wallet actually produced
  // (authoritative, full, cached), not horizon-parsed recent activity.
  const { events, isLoading, error: historyError } = useSavingsHistory(walletAddress);

  const now = useMemo(() => Date.now(), []);

  const allPoints = useMemo(
    () => buildRealEarningsHistory(events, currentEarnings, now, NUM_POINTS),
    [events, currentEarnings, now]
  );

  const chartPoints = useMemo(
    () => filterByWindow(allPoints, filter, now),
    [allPoints, filter, now]
  );

  // Period earnings from curve — one value per filter
  const periodEarnings = useMemo(
    () => ({
      '1W': getPeriodEarnings(allPoints, 7 * 24 * 3600 * 1000, now),
      '1M': getPeriodEarnings(allPoints, 30 * 24 * 3600 * 1000, now),
      '3M': getPeriodEarnings(allPoints, 90 * 24 * 3600 * 1000, now),
      '6M': getPeriodEarnings(allPoints, 180 * 24 * 3600 * 1000, now),
      '1Y': getPeriodEarnings(allPoints, 365 * 24 * 3600 * 1000, now),
      '5Y': getPeriodEarnings(allPoints, 5 * 365 * 24 * 3600 * 1000, now),
      ALL: currentEarnings,
    }),
    [allPoints, currentEarnings, now]
  );

  const PERIOD_LABEL: Record<TimeFilter, string> = {
    '1W': '7 Days',
    '1M': '30 Days',
    '3M': '90 Days',
    '6M': '6 Months',
    '1Y': '1 Year',
    '5Y': '5 Years',
    ALL: 'All Time',
  };

  // Tight y-range: scale to visible data, not 0→globalMax
  const yMinData = chartPoints.length > 0 ? Math.min(...chartPoints.map((p) => p.v)) : 0;
  const yMaxData = Math.max(...chartPoints.map((p) => p.v), 0.0001);
  const yRange = yMaxData - yMinData;
  const yPad = Math.max(yRange * 0.18, 0.000001);
  const yLow = Math.max(0, yMinData - yPad * 0.4);
  const yHigh = yMaxData + yPad;
  const yMid = (yLow + yHigh) / 2;

  // SVG coordinate functions
  const minT = chartPoints.length > 0 ? chartPoints[0].t : now - WINDOW_MS['1W']!;
  const maxT = now;
  const xFn = (t: number) => (maxT === minT ? CHART_W / 2 : ((t - minT) / (maxT - minT)) * CHART_W);
  const yFn = (v: number) =>
    yHigh === yLow ? CHART_H / 2 : CHART_H - 4 - ((v - yLow) / (yHigh - yLow)) * (CHART_H - 10);

  // Build SVG paths
  let linePath: string | null = null;
  let areaPath: string | null = null;
  if (chartPoints.length >= 2) {
    const coords = chartPoints.map((p) => ({ x: xFn(p.t), y: yFn(p.v) }));
    const parts = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`);
    linePath = parts.join(' ');
    const last = coords[coords.length - 1];
    const first = coords[0];
    const botY = yFn(yLow).toFixed(1);
    areaPath = `${linePath} L${last.x.toFixed(1)},${botY} L${first.x.toFixed(1)},${botY} Z`;
  }

  const lastPoint = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1] : null;
  const endX = lastPoint ? xFn(lastPoint.t) : CHART_W;
  const endY = lastPoint ? yFn(lastPoint.v) : CHART_H / 2;

  const gridYs = [yFn(yHigh), yFn(yMid), yFn(yLow)].map((v) => v.toFixed(1));

  // Stat chip helper
  const StatChip = ({
    label,
    value,
    accent = false,
    estimated = false,
  }: {
    label: string;
    value: number;
    accent?: boolean;
    estimated?: boolean;
  }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
      <Typography
        sx={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'inherit',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: accent ? '20px' : '15px',
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
          color: 'inherit',
        }}
      >
        {estimated ? '~' : ''}
        {fmtStat(value)}
      </Typography>
    </Box>
  );

  if (historyError && events.length === 0 && !isLoading) {
    // Doc 90 W3: a failed history fetch used to render a flat "$0.00" curve
    // presented as the user's real earnings. Say it instead.
    return (
      <Typography sx={{ fontSize: '14px', color: 'text.secondary' }}>
        Couldn&apos;t load your earnings history. It tries again on its own.
      </Typography>
    );
  }

  return (
    <Box sx={{ color: 'text.primary' }}>
      {/* Stats + filter row */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: '28px', sm: 0 },
          mb: { xs: '24px', sm: '16px' },
        }}
      >
        {/* Earnings for selected period */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          <StatChip label={PERIOD_LABEL[filter]} value={periodEarnings[filter]} accent />
        </Box>

        {/* Time filter */}
        <Box
          sx={{
            ml: { xs: 0, sm: 'auto' },
            alignSelf: { xs: 'flex-end', sm: 'auto' },
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2px',
            pl: { xs: 0, sm: '16px' },
          }}
        >
          {TIME_FILTERS.map((f) => (
            <Box
              key={f}
              component="button"
              onClick={() => setFilter(f)}
              sx={{
                px: '9px',
                py: '4px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 500,
                lineHeight: 1.4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.12s',
                bgcolor: filter === f ? CANVAS : 'transparent',
                color: filter === f ? INK : MUTED,
                '&:hover': { color: INK, bgcolor: filter === f ? CANVAS : HOVER },
              }}
            >
              {f}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Chart area */}
      {isLoading && !!walletAddress ? (
        <Skeleton
          variant="rectangular"
          height={CHART_H + 24}
          sx={{ bgcolor: 'currentColor', opacity: 0.06 }}
        />
      ) : (
        <Box>
          <Box sx={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
            {/* Y-axis labels */}
            <Box
              sx={{
                width: 52,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: `${CHART_H}px`,
                pr: '8px',
                py: '2px',
              }}
            >
              {[yHigh, yMid, yLow].map((v, i) => (
                <Typography
                  key={i}
                  sx={{
                    fontSize: '11px',
                    color: 'inherit',
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'right',
                    lineHeight: 1,
                  }}
                >
                  {fmtY(v)}
                </Typography>
              ))}
            </Box>

            {/* SVG chart */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <svg
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                preserveAspectRatio="none"
                style={{ display: 'block', width: '100%', height: `${CHART_H}px` }}
              >
                {/* Subtle grid lines */}
                {gridYs.map((gy, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={gy}
                    x2={CHART_W}
                    y2={gy}
                    stroke="currentColor"
                    strokeOpacity="0.08"
                    strokeWidth="1"
                  />
                ))}

                {linePath && areaPath ? (
                  <>
                    <path d={areaPath} fill="currentColor" fillOpacity="0.04" />
                    <path
                      d={linePath}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {lastPoint && (
                      <>
                        <circle cx={endX} cy={endY} r="8" fill="currentColor" fillOpacity="0.18" />
                        <circle cx={endX} cy={endY} r="3.5" fill="currentColor" />
                      </>
                    )}
                  </>
                ) : (
                  <line
                    x1="0"
                    y1={CHART_H * 0.72}
                    x2={CHART_W}
                    y2={CHART_H * 0.72}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="7 5"
                    strokeOpacity="0.35"
                  />
                )}
              </svg>
            </Box>
          </Box>

          {/* X-axis labels */}
          <Box
            sx={{
              ml: '52px',
              display: 'flex',
              justifyContent: 'space-between',
              mt: '6px',
            }}
          >
            <Typography sx={{ fontSize: '11px', color: 'inherit' }}>
              {chartPoints.length > 0 ? fmtDate(minT, now) : ''}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: 'inherit' }}>Today</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

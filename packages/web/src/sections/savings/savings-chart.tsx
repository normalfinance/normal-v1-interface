'use client';

import { useMemo, useState } from 'react';
import { useSavingsHistory } from '@/hooks/use-savings-history';
import { buildRealEarningsHistory } from '@/lib/savings/earnings-history';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

type TimeFilter = '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';

const MONO = '"Geist Mono", ui-monospace, monospace';
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
  if (v >= 100) return `$${v.toFixed(2)}`;
  if (v >= 1) return `$${v.toFixed(3)}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  if (v >= 0.001) return `$${v.toFixed(5)}`;
  return `$${v.toFixed(6)}`;
}

function fmtStat(v: number): string {
  if (v <= 0) return '$0.00000';
  if (v >= 100) return `$${v.toFixed(2)}`;
  if (v >= 1) return `$${v.toFixed(4)}`;
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
          fontSize: '9.5px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.28)',
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: MONO,
          letterSpacing: '-0.01em',
          color: accent
            ? '#4ADE80'
            : estimated
              ? 'rgba(255,255,255,0.5)'
              : 'rgba(255,255,255,0.85)',
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
      <Box sx={{ mt: '20px', pt: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
          {`Couldn't load your earnings history — it retries automatically.`}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: '20px', pt: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
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
                borderRadius: '6px',
                border: 'none',
                fontSize: '11px',
                fontWeight: 500,
                lineHeight: 1.4,
                cursor: 'pointer',
                fontFamily: MONO,
                transition: 'background 0.12s, color 0.12s',
                bgcolor: filter === f ? 'rgba(74,222,128,0.18)' : 'transparent',
                color: filter === f ? '#4ADE80' : 'rgba(255,255,255,0.28)',
                '&:hover': { color: filter === f ? '#4ADE80' : 'rgba(255,255,255,0.55)' },
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
          sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}
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
                    fontSize: '9px',
                    color: 'rgba(255,255,255,0.25)',
                    fontFamily: MONO,
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
                <defs>
                  <linearGradient id="nf-earnings-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#4ADE80" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Subtle grid lines */}
                {gridYs.map((gy, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={gy}
                    x2={CHART_W}
                    y2={gy}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                ))}

                {linePath && areaPath ? (
                  <>
                    <path d={areaPath} fill="url(#nf-earnings-area)" />
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#4ADE80"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {lastPoint && (
                      <>
                        <circle cx={endX} cy={endY} r="8" fill="#4ADE80" fillOpacity="0.18" />
                        <circle cx={endX} cy={endY} r="3.5" fill="#4ADE80" />
                      </>
                    )}
                  </>
                ) : (
                  <line
                    x1="0"
                    y1={CHART_H * 0.72}
                    x2={CHART_W}
                    y2={CHART_H * 0.72}
                    stroke="#4ADE80"
                    strokeWidth="1.5"
                    strokeDasharray="7 5"
                    strokeOpacity="0.2"
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
            <Typography sx={{ fontSize: '9px', color: 'rgba(255,255,255,0.22)', fontFamily: MONO }}>
              {chartPoints.length > 0 ? fmtDate(minT, now) : '—'}
            </Typography>
            <Typography sx={{ fontSize: '9px', color: 'rgba(255,255,255,0.22)', fontFamily: MONO }}>
              Today
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

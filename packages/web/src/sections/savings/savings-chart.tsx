'use client';

import type { SavingsDepositActivity, SavingsWithdrawActivity } from '@/types/activity';

import { useState, useMemo } from 'react';
import { useUserActivity } from '@/hooks/stellar/use-user-activity';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

type TimeFilter = '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';
type SavingsActivity = SavingsDepositActivity | SavingsWithdrawActivity;

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

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const CHART_W = 800;
const CHART_H = 176;
const NUM_POINTS = 80;

interface ChartPoint {
  t: number;
  v: number;
}

/**
 * Builds a smooth earnings curve using compound interest on deposit/withdraw history.
 * The last point is scaled to match the actual API earnings value.
 */
function buildEarningsHistory(
  activity: SavingsActivity[],
  actualEarnings: number,
  apy: number,
  now: number
): ChartPoint[] {
  const sorted = [...activity].sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length === 0) return [];

  const firstT = sorted[0].timestamp;
  if (now <= firstT) return [];

  const r = apy / 100;
  const step = (now - firstT) / (NUM_POINTS - 1);

  const points: ChartPoint[] = Array.from({ length: NUM_POINTS }, (_, i) => {
    const T = firstT + i * step;

    let balance = 0;
    let earnings = 0;
    let prevT = firstT;

    for (const event of sorted) {
      if (event.timestamp > T) break;
      // Accrue compound interest from prevT to this event
      const dt = (event.timestamp - prevT) / YEAR_MS;
      earnings += balance > 0 ? balance * (Math.exp(r * dt) - 1) : 0;

      const amount = parseFloat(event.amount);
      if (event.type === 'Savings Deposit') balance += amount;
      else balance = Math.max(0, balance - amount);

      prevT = event.timestamp;
    }

    // Accrue from last event to T
    const dt = (T - prevT) / YEAR_MS;
    earnings += balance > 0 ? balance * (Math.exp(r * dt) - 1) : 0;

    return { t: T, v: Math.max(0, earnings) };
  });

  // Scale the curve so the last point matches the actual API earnings
  const lastEstimate = points[points.length - 1].v;
  if (lastEstimate > 0 && actualEarnings >= 0) {
    const scale = actualEarnings / lastEstimate;
    return points.map((p) => ({ t: p.t, v: p.v * scale }));
  }

  // Fallback: flat until now
  points[points.length - 1].v = actualEarnings;
  return points;
}

function filterByWindow(points: ChartPoint[], filter: TimeFilter, now: number): ChartPoint[] {
  const windowMs = WINDOW_MS[filter];
  if (!windowMs || points.length === 0) return points;

  const cutoff = now - windowMs;
  const after = points.filter((p) => p.t >= cutoff);

  // Find the interpolated start value at the cutoff
  const before = points.filter((p) => p.t < cutoff);
  const startV = before.length > 0 ? before[before.length - 1].v : 0;

  if (after.length === 0) return [{ t: cutoff, v: startV }, { t: now, v: startV }];
  return [{ t: cutoff, v: startV }, ...after];
}

function buildSvgPaths(
  points: ChartPoint[],
  minT: number,
  maxT: number,
  maxV: number
): { line: string; area: string } | null {
  if (points.length < 2) return null;

  const x = (t: number) => (maxT === minT ? CHART_W / 2 : ((t - minT) / (maxT - minT)) * CHART_W);
  const y = (v: number) =>
    maxV === 0 ? CHART_H * 0.75 : CHART_H - 4 - (v / maxV) * (CHART_H - 14);

  const coords = points.map((p) => ({ x: x(p.t), y: y(p.v) }));
  const lineParts = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`);
  const line = lineParts.join(' ');
  const last = coords[coords.length - 1];
  const first = coords[0];
  const area = `${line} L${last.x.toFixed(1)},${CHART_H} L${first.x.toFixed(1)},${CHART_H} Z`;

  return { line, area };
}

interface SavingsChartProps {
  walletAddress?: string;
  currentEarnings: number;
  apy?: number | null;
}

export function SavingsChart({ walletAddress, currentEarnings, apy }: SavingsChartProps) {
  const [filter, setFilter] = useState<TimeFilter>('1W');
  const { recentActivity, isLoading } = useUserActivity(walletAddress);

  const now = useMemo(() => Date.now(), []);

  const savingsActivity = useMemo(
    () =>
      recentActivity.filter(
        (a): a is SavingsActivity =>
          a.type === 'Savings Deposit' || a.type === 'Savings Withdraw'
      ),
    [recentActivity]
  );

  const allPoints = useMemo(
    () => buildEarningsHistory(savingsActivity, currentEarnings, apy ?? 7, now),
    [savingsActivity, currentEarnings, apy, now]
  );

  const chartPoints = useMemo(
    () => filterByWindow(allPoints, filter, now),
    [allPoints, filter, now]
  );

  const maxV = useMemo(() => Math.max(...chartPoints.map((p) => p.v), 0.0001), [chartPoints]);
  const minT = chartPoints.length > 0 ? chartPoints[0].t : now;
  const maxT = now;

  const paths = buildSvgPaths(chartPoints, minT, maxT, maxV);

  const lastPoint = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1] : null;
  const endX =
    lastPoint && maxT !== minT
      ? ((lastPoint.t - minT) / (maxT - minT)) * CHART_W
      : CHART_W / 2;
  const endY =
    lastPoint && maxV > 0
      ? CHART_H - 4 - (lastPoint.v / maxV) * (CHART_H - 14)
      : CHART_H * 0.75;

  return (
    <Box sx={{ mt: '20px', pt: '18px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header + filter row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '10px' }}>
        <Box
          sx={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Earnings
        </Box>
        <Box sx={{ display: 'flex', gap: '2px' }}>
          {TIME_FILTERS.map((f) => (
            <Box
              key={f}
              component="button"
              onClick={() => setFilter(f)}
              sx={{
                px: '10px',
                py: '4px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '11px',
                fontWeight: 500,
                lineHeight: 1.4,
                cursor: 'pointer',
                fontFamily: '"Geist Mono", ui-monospace, monospace',
                transition: 'background 0.12s, color 0.12s',
                bgcolor: filter === f ? 'rgba(74,222,128,0.18)' : 'transparent',
                color: filter === f ? '#4ADE80' : 'rgba(255,255,255,0.3)',
                '&:hover': { color: filter === f ? '#4ADE80' : 'rgba(255,255,255,0.55)' },
              }}
            >
              {f}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Chart */}
      {isLoading && !!walletAddress ? (
        <Skeleton
          variant="rectangular"
          height={CHART_H}
          sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}
        />
      ) : (
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            preserveAspectRatio="none"
            style={{ display: 'block', width: '100%', height: `${CHART_H}px` }}
          >
            <defs>
              <linearGradient id="nf-earnings-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#4ADE80" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {paths ? (
              <>
                <path d={paths.area} fill="url(#nf-earnings-area)" />
                <path
                  d={paths.line}
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
      )}
    </Box>
  );
}

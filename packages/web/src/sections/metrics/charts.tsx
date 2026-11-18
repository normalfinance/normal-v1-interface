'use client';

import type { ChartOptions } from '@/components/template/chart';
import type { Point, Bucket, StackedDaily } from '@/lib/metrics/periods';

import { TYPE } from '@/theme/type-scale';
import { fNumber } from '@/utils/format-number';
import { INK, HOVER, MUTED, PAPER, CANVAS, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { HAIRLINE } from '@/components/_common/brand';
import { Chart, useChart } from '@/components/template/chart';

import { NoData, fMoney, fBucket, chartColor, fMoneyShort, useChartTokens } from './parts';

// ----------------------------------------------------------------------
// The /dashboard charts. Every chart draws buckets the page already cut for
// the chosen period (lib/metrics/periods.ts) and carries a download menu
// (PNG, SVG, CSV) so marketing can lift a chart straight into a post or deck.
//
// Drawn the way the site and the app draw: flat and square, the scale on the
// right with faint solid lines across it (GRID_COLOR), one colour per thing
// it names (a product, a chain, a coin) and ink for a plain count. The
// neutrals come from the visitor's mode (useChartTokens).
// ----------------------------------------------------------------------

const round2 = (value: number) => Math.round(value * 100) / 100;
const dayTime = (day: string) => Date.parse(`${day}T00:00:00Z`);

/** The chart library's own pieces (tooltip, download menu) in the site's style. */
const CHART_SX = {
  '& text': { fontVariantNumeric: 'tabular-nums' },
  '& .apexcharts-tooltip': {
    borderRadius: 0,
    border: `1px solid ${HAIRLINE_STRONG}`,
    bgcolor: PAPER,
    color: INK,
    fontSize: 13,
  },
  '& .apexcharts-tooltip-title': {
    fontWeight: 500,
    textAlign: 'left',
    color: MUTED,
    bgcolor: CANVAS,
    borderBottom: HAIRLINE,
  },
  '& .apexcharts-xaxistooltip': { display: 'none' },
  '& .apexcharts-toolbar': { zIndex: 2 },
  '& .apexcharts-menu-icon svg': { fill: MUTED },
  '& .apexcharts-menu-icon:hover svg': { fill: INK },
  '& .apexcharts-menu': {
    borderRadius: 0,
    boxShadow: 'none',
    border: `1px solid ${HAIRLINE_STRONG}`,
    bgcolor: PAPER,
    color: INK,
    p: 0.5,
    minWidth: 132,
  },
  '& .apexcharts-menu-item': { px: 1.5, py: 1, fontSize: 13, '&:hover': { bgcolor: HOVER } },
} as const;

/** The download menu, named after the chart and the period. */
function downloadOptions(filename: string): NonNullable<ChartOptions>['chart'] {
  return {
    toolbar: {
      show: true,
      offsetY: -2,
      tools: {
        download: true,
        selection: false,
        zoom: false,
        zoomin: false,
        zoomout: false,
        pan: false,
        reset: false,
      },
      export: {
        csv: {
          filename,
          headerCategory: 'Date',
          // Time axes export each bar's start day, not a raw timestamp.
          categoryFormatter: (time?: number) =>
            typeof time === 'number' && Number.isFinite(time)
              ? new Date(time).toISOString().slice(0, 10)
              : (time ?? ''),
        },
        png: { filename },
        svg: { filename },
      },
    },
  };
}

function axisFormat(money?: boolean) {
  return (value: number) => (money ? fMoneyShort(value) : fNumber(value));
}

function tipFormat(money?: boolean) {
  return (value: number) => (money ? fMoney(value) : fNumber(value));
}

/** A part's share in words: "96%", "0.4%", "<0.1%" (never a misleading "0.0%"). */
export function fShare(share: number): string {
  if (share <= 0) return '0%';
  if (share < 0.001) return '<0.1%';
  return `${(share * 100).toFixed(share < 0.01 ? 1 : 0)}%`;
}

function timeSeries(points: Point[]): [number, number][] {
  return points.map((p): [number, number] => [dayTime(p.day), round2(p.value)]);
}

/** What every chart shares: the mode's neutrals, square marks, the scale on the right. */
function useBaseOptions(filename: string, money?: boolean): NonNullable<ChartOptions> {
  const tokens = useChartTokens();
  const label = { colors: tokens.muted, fontSize: '12px' };
  return {
    chart: { ...downloadOptions(filename), foreColor: tokens.muted },
    grid: {
      borderColor: tokens.grid,
      strokeDashArray: 0,
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    xaxis: { type: 'datetime', labels: { datetimeUTC: true, style: label } },
    yaxis: { opposite: true, labels: { formatter: axisFormat(money), style: label } },
    markers: { strokeColors: tokens.paper },
    plotOptions: { bar: { borderRadius: 0 } },
    legend: {
      labels: { colors: tokens.ink },
      markers: { shape: 'square', size: 5 },
      fontSize: '13px',
      fontWeight: 400,
    },
    dataLabels: { enabled: false },
  };
}

/** One series of bars over time: sign-ups, active wallets. Ink unless it names something. */
export function BucketBars({
  points,
  bucket,
  name,
  money,
  filename,
  empty,
  color = INK,
}: {
  points: Point[];
  bucket: Bucket;
  name: string;
  money?: boolean;
  filename: string;
  /** What the chart says when it has nothing to draw. */
  empty?: string;
  color?: string;
}) {
  const tokens = useChartTokens();
  const base = useBaseOptions(filename, money);
  const options = useChart({
    ...base,
    colors: [chartColor(color, tokens)],
    tooltip: {
      x: { formatter: (time: number) => fBucket(time, bucket) },
      y: { formatter: tipFormat(money) },
    },
    stroke: { width: 0 },
    fill: { type: 'solid', opacity: 1 },
    plotOptions: {
      bar: {
        borderRadius: 0,
        columnWidth: bucket === 'day' && points.length > 20 ? '72%' : '56%',
      },
    },
    legend: { show: false },
  });
  if (!points.length || points.every((p) => p.value === 0)) return <NoData text={empty} />;
  return (
    <Chart
      type="bar"
      series={[{ name, data: timeSeries(points) }]}
      options={options}
      sx={{ height: 280, ...CHART_SX }}
    />
  );
}

/** One level over time: money in savings, running totals. A line over a flat wash. */
export function BucketArea({
  points,
  bucket,
  name,
  money,
  filename,
  empty,
  color = INK,
}: {
  points: Point[];
  bucket: Bucket;
  name: string;
  money?: boolean;
  filename: string;
  /** What the chart says when it has nothing to draw. */
  empty?: string;
  color?: string;
}) {
  const tokens = useChartTokens();
  const base = useBaseOptions(filename, money);
  const options = useChart({
    ...base,
    colors: [chartColor(color, tokens)],
    tooltip: {
      x: { formatter: (time: number) => fBucket(time, bucket) },
      y: { formatter: tipFormat(money) },
    },
    stroke: { width: 2, curve: 'straight', lineCap: 'butt' },
    // A flat wash: the site draws nothing with a gradient (DESIGN.md).
    fill: { type: 'solid', opacity: 0.12 },
    markers: { size: points.length <= 31 ? 3 : 0, strokeWidth: 2, strokeColors: tokens.paper },
    legend: { show: false },
  });
  if (!points.length) return <NoData text={empty} />;
  return (
    <Chart
      type="area"
      series={[{ name, data: timeSeries(points) }]}
      options={options}
      sx={{ height: 280, ...CHART_SX }}
    />
  );
}

/** Several series per bucket, stacked (default) or side by side, each in its own colour. */
export function StackedBuckets({
  data,
  bucket,
  colorOf,
  labelOf,
  money,
  stacked = true,
  filename,
  empty,
}: {
  data: StackedDaily;
  bucket: Bucket;
  colorOf: (name: string) => string;
  labelOf: (name: string) => string;
  money?: boolean;
  stacked?: boolean;
  filename: string;
  /** What the chart says when it has nothing to draw. */
  empty?: string;
}) {
  const tokens = useChartTokens();
  const base = useBaseOptions(filename, money);
  const options = useChart({
    ...base,
    chart: { ...base.chart, stacked },
    colors: data.series.map((s) => chartColor(colorOf(s.name), tokens)),
    tooltip: {
      shared: true,
      intersect: false,
      x: { formatter: (time: number) => fBucket(time, bucket) },
      y: { formatter: tipFormat(money) },
    },
    // A line of the page between the parts of a stack, so neighbours never merge.
    stroke: { width: stacked ? 1 : 0, colors: [tokens.paper] },
    fill: { type: 'solid', opacity: 1 },
    plotOptions: {
      bar: {
        borderRadius: 0,
        columnWidth: bucket === 'day' && data.days.length > 20 ? '72%' : '56%',
      },
    },
    legend: {
      ...base.legend,
      show: true,
      showForSingleSeries: true,
      position: 'top',
      horizontalAlign: 'left',
      offsetX: -8,
      itemMargin: { horizontal: 10, vertical: 4 },
    },
  });
  if (!data.days.length || !data.series.length) return <NoData text={empty} />;
  return (
    <Chart
      type="bar"
      series={data.series.map((s) => ({
        name: labelOf(s.name),
        data: data.days.map((day, i): [number, number] => [dayTime(day), round2(s.data[i] ?? 0)]),
      }))}
      options={options}
      sx={{ height: 300, ...CHART_SX }}
    />
  );
}

/**
 * Shares of a total: a ring, and beside it every part as a row (its colour,
 * name, amount and share), so a thin slice never hides its number.
 */
export function Donut({
  slices,
  colorOf,
  labelOf,
  money = true,
  filename,
  empty,
}: {
  slices: { label: string; value: number }[];
  colorOf: (name: string) => string;
  labelOf: (name: string) => string;
  money?: boolean;
  filename: string;
  /** What the chart says when it has nothing to draw. */
  empty?: string;
}) {
  const tokens = useChartTokens();
  const base = useBaseOptions(filename, money);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const format = tipFormat(money);
  const colors = slices.map((s) => chartColor(colorOf(s.label), tokens));
  const options = useChart({
    chart: base.chart,
    labels: slices.map((s) => labelOf(s.label)),
    colors,
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: format } },
    // A 2px gap of the page between the parts, nothing drawn around them.
    stroke: { width: 2, colors: [tokens.paper] },
    states: { hover: { filter: { type: 'none' } }, active: { filter: { type: 'none' } } },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          size: '80%',
          labels: {
            show: true,
            name: { color: tokens.muted, fontSize: '13px', fontWeight: 400, offsetY: -6 },
            value: {
              color: tokens.ink,
              fontSize: '18px',
              fontWeight: 500,
              offsetY: 6,
              formatter: (value: string) => format(Number(value)),
            },
            total: {
              show: true,
              label: 'Total',
              color: tokens.muted,
              fontSize: '13px',
              fontWeight: 400,
              formatter: () => format(total),
            },
          },
        },
      },
    },
  });
  if (!slices.length) return <NoData text={empty} />;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '220px minmax(0, 1fr)' },
        alignItems: 'center',
        gap: { xs: 2, sm: 4 },
      }}
    >
      <Chart
        type="donut"
        series={slices.map((s) => round2(s.value))}
        options={options}
        sx={{ height: 220, maxWidth: 260, mx: 'auto', ...CHART_SX }}
      />
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {slices.map((slice, index) => (
          <Box
            component="li"
            key={slice.label}
            sx={{
              display: 'grid',
              gridTemplateColumns: '10px minmax(0, 1fr) auto 48px',
              alignItems: 'center',
              columnGap: 1.5,
              py: 1.25,
              borderBottom: HAIRLINE,
              '&:first-of-type': { borderTop: HAIRLINE },
            }}
          >
            <Box sx={{ width: 10, height: 10, bgcolor: colors[index] }} />
            <Typography sx={{ ...TYPE.small, color: INK }} noWrap>
              {labelOf(slice.label)}
            </Typography>
            <Typography sx={{ ...TYPE.small, color: INK, fontVariantNumeric: 'tabular-nums' }}>
              {format(slice.value)}
            </Typography>
            <Typography
              sx={{
                ...TYPE.small,
                color: MUTED,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {total > 0 ? fShare(slice.value / total) : ''}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Horizontal bars, largest first. `colors` gives each bar its own colour
 * (chains, coins); `labelOf` writes a value label at the end of each bar.
 */
export function RankedBars({
  rows,
  name,
  money,
  filename,
  empty,
  colors,
  labelOf,
}: {
  rows: { label: string; value: number }[];
  name: string;
  money?: boolean;
  filename: string;
  /** What the chart says when it has nothing to draw. */
  empty?: string;
  colors?: string[];
  labelOf?: (index: number) => string;
}) {
  const tokens = useChartTokens();
  const base = useBaseOptions(filename, money);
  // Labels sit past the end of each bar: leave the longest one room for its
  // label, on a tidy scale end (47 -> 60, 8 -> 10).
  const largest = rows.reduce((max, r) => Math.max(max, r.value), 0);
  let scaleEnd: number | undefined;
  if (labelOf && largest > 0) {
    const target = largest * 1.25;
    const step = 10 ** Math.floor(Math.log10(target)) / 2;
    scaleEnd = Math.ceil(target / step) * step;
  }
  const label = { colors: tokens.muted, fontSize: '12px' };
  const options = useChart({
    chart: base.chart,
    grid: { ...base.grid, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    colors: colors ? colors.map((c) => chartColor(c, tokens)) : [tokens.ink],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 0,
        barHeight: '64%',
        distributed: !!colors,
        dataLabels: { position: 'top' },
      },
    },
    xaxis: {
      categories: rows.map((r) => r.label),
      max: scaleEnd,
      labels: { formatter: (value: string) => axisFormat(money)(Number(value)), style: label },
    },
    yaxis: { labels: { style: { ...label, colors: tokens.ink, fontSize: '13px' } } },
    tooltip: { y: { formatter: tipFormat(money) } },
    dataLabels: labelOf
      ? {
          enabled: true,
          offsetX: 28,
          style: { colors: [tokens.ink], fontWeight: 500, fontSize: '12px' },
          formatter: (_value: number, opts: any) => labelOf(opts?.dataPointIndex ?? 0),
        }
      : { enabled: false },
    legend: { show: false },
  });
  if (!rows.length) return <NoData text={empty} />;
  return (
    <Chart
      type="bar"
      series={[{ name, data: rows.map((r) => round2(r.value)) }]}
      options={options}
      sx={{ height: Math.max(200, rows.length * 30 + 56), ...CHART_SX }}
    />
  );
}

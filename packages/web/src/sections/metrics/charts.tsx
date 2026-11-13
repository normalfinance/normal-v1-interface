'use client';

import type { ChartOptions } from '@/components/template/chart';
import type { Point, Bucket, StackedDaily } from '@/lib/metrics/periods';

import { fNumber } from '@/utils/format-number';

import { useTheme } from '@mui/material/styles';

import { Chart, useChart } from '@/components/template/chart';

import { NoData, fMoney, fBucket, fMoneyShort } from './parts';

// ----------------------------------------------------------------------
// The /dashboard charts. Every chart draws buckets the page already cut for
// the chosen period (lib/metrics/periods.ts) and carries a download menu
// (PNG, SVG, CSV) so marketing can lift a chart straight into a post or deck.
// ----------------------------------------------------------------------

const round2 = (value: number) => Math.round(value * 100) / 100;
const dayTime = (day: string) => Date.parse(`${day}T00:00:00Z`);

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

function timeSeries(points: Point[]): [number, number][] {
  return points.map((p): [number, number] => [dayTime(p.day), round2(p.value)]);
}

/** One series of bars over time: sign-ups, active wallets, flows. */
export function BucketBars({
  points,
  bucket,
  name,
  money,
  filename,
  empty,
  color,
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
  const theme = useTheme();
  const options = useChart({
    chart: downloadOptions(filename),
    colors: [color ?? theme.palette.primary.main],
    xaxis: { type: 'datetime', labels: { datetimeUTC: true } },
    yaxis: { labels: { formatter: axisFormat(money) } },
    tooltip: {
      x: { formatter: (time: number) => fBucket(time, bucket) },
      y: { formatter: tipFormat(money) },
    },
    stroke: { width: 0 },
    fill: { type: 'solid', opacity: 1 },
    plotOptions: { bar: { columnWidth: bucket === 'day' && points.length > 20 ? '80%' : '60%' } },
    dataLabels: { enabled: false },
    legend: { show: false },
  });
  if (!points.length || points.every((p) => p.value === 0)) return <NoData text={empty} />;
  return (
    <Chart
      type="bar"
      series={[{ name, data: timeSeries(points) }]}
      options={options}
      sx={{ height: 300 }}
    />
  );
}

/** One level over time: money in savings, running totals. */
export function BucketArea({
  points,
  bucket,
  name,
  money,
  filename,
  empty,
}: {
  points: Point[];
  bucket: Bucket;
  name: string;
  money?: boolean;
  filename: string;
  /** What the chart says when it has nothing to draw. */
  empty?: string;
}) {
  const theme = useTheme();
  const options = useChart({
    chart: downloadOptions(filename),
    colors: [theme.palette.primary.main],
    xaxis: { type: 'datetime', labels: { datetimeUTC: true } },
    yaxis: { labels: { formatter: axisFormat(money) } },
    tooltip: {
      x: { formatter: (time: number) => fBucket(time, bucket) },
      y: { formatter: tipFormat(money) },
    },
    stroke: { width: 2, curve: 'straight' },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.04 } },
    markers: { size: points.length <= 31 ? 3 : 0 },
    dataLabels: { enabled: false },
    legend: { show: false },
  });
  if (!points.length) return <NoData text={empty} />;
  return (
    <Chart
      type="area"
      series={[{ name, data: timeSeries(points) }]}
      options={options}
      sx={{ height: 300 }}
    />
  );
}

/** Several series per bucket, stacked (default) or side by side. */
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
  const options = useChart({
    chart: { ...downloadOptions(filename), stacked },
    colors: data.series.map((s) => colorOf(s.name)),
    xaxis: { type: 'datetime', labels: { datetimeUTC: true } },
    yaxis: { labels: { formatter: axisFormat(money) } },
    tooltip: {
      shared: true,
      intersect: false,
      x: { formatter: (time: number) => fBucket(time, bucket) },
      y: { formatter: tipFormat(money) },
    },
    stroke: { width: 0 },
    fill: { type: 'solid', opacity: 1 },
    plotOptions: {
      bar: { columnWidth: bucket === 'day' && data.days.length > 20 ? '80%' : '60%' },
    },
    dataLabels: { enabled: false },
    legend: { show: true, position: 'top', horizontalAlign: 'left' },
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
      sx={{ height: 320 }}
    />
  );
}

/** Shares of a total; the values sit in the legend so a thin slice never hides its number. */
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
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const format = tipFormat(money);
  const options = useChart({
    chart: downloadOptions(filename),
    labels: slices.map((s) => labelOf(s.label)),
    colors: slices.map((s) => colorOf(s.label)),
    legend: {
      show: true,
      position: 'bottom',
      formatter: (name: string, opts: any) =>
        `${name}: ${format(opts?.w?.globals?.series?.[opts.seriesIndex] ?? 0)}`,
    },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: format } },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            value: { formatter: (value: string) => format(Number(value)) },
            total: { show: true, label: 'Total', formatter: () => format(total) },
          },
        },
      },
    },
  });
  if (!slices.length) return <NoData text={empty} />;
  return (
    <Chart
      type="donut"
      series={slices.map((s) => round2(s.value))}
      options={options}
      sx={{ height: 360 }}
    />
  );
}

/**
 * Horizontal bars, largest first. `colors` gives each bar its own colour
 * (chains); `labelOf` writes a value label at the end of each bar.
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
  const theme = useTheme();
  // Labels sit past the end of each bar: leave the longest one room for its
  // label, on a tidy scale end (47 -> 60, 8 -> 10).
  const largest = rows.reduce((max, r) => Math.max(max, r.value), 0);
  let scaleEnd: number | undefined;
  if (labelOf && largest > 0) {
    const target = largest * 1.25;
    const step = 10 ** Math.floor(Math.log10(target)) / 2;
    scaleEnd = Math.ceil(target / step) * step;
  }
  const options = useChart({
    chart: downloadOptions(filename),
    colors: colors ?? [theme.palette.primary.main],
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '70%',
        borderRadius: 2,
        distributed: !!colors,
        dataLabels: { position: 'top' },
      },
    },
    xaxis: {
      categories: rows.map((r) => r.label),
      max: scaleEnd,
      labels: { formatter: (value: string) => axisFormat(money)(Number(value)) },
    },
    tooltip: { y: { formatter: tipFormat(money) } },
    dataLabels: labelOf
      ? {
          enabled: true,
          offsetX: 28,
          style: { colors: [theme.palette.text.primary], fontWeight: 500 },
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
      sx={{ height: Math.max(220, rows.length * 32 + 60) }}
    />
  );
}

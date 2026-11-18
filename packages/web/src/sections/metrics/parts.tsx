'use client';

import type { ReactNode } from 'react';
import type { Theme, SxProps } from '@mui/material/styles';
import type { Bucket, PeriodKey } from '@/lib/metrics/periods';

import { TYPE } from '@/theme/type-scale';
import { PERIODS } from '@/lib/metrics/periods';
import { fCurrency } from '@/utils/format-number';
import { CHAINS, isChainId } from '@/lib/chains/registry';
import { PRE_RECORDING_FEES } from '@/lib/metrics/snapshot';
import { GUTTER_SX, GRID_FRAME_SX } from '@/theme/site-grid';
import { useSiteTheme } from '@/layouts/site/use-site-theme';
import { INK, MUTED, PAPER, PALETTE, BRAND_COLORS, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { HATCH_SX } from '@/components/_common/hatch';
import { SegmentedControl, VISUALLY_HIDDEN_SX } from '@/components/_common/brand';

// ----------------------------------------------------------------------
// Pieces shared by /dashboard and /dashboard/team, in the marketing site's
// style (DESIGN.md): content in the column between the frame lines, set as
// cells that share their hairlines and reach the lines, the site's type ladder,
// and colours from the tokens, so both modes are right.
// ----------------------------------------------------------------------

export const PRODUCT_LABEL: Record<string, string> = {
  savings: 'Savings',
  cctp: 'CCTP',
  soroswap: 'Soroswap',
  lifi: 'LI.FI',
  send: 'Sends',
  ramp: 'Buy and sell',
  [PRE_RECORDING_FEES]: 'LI.FI, before recording',
};

export const productLabel = (product: string) => PRODUCT_LABEL[product] ?? product;
export const chainColor = (chain: string) => (isChainId(chain) ? CHAINS[chain].brandColor : INK);
export const chainLabel = (chain: string) => (isChainId(chain) ? CHAINS[chain].name : chain);

// ---------------------------------------------------------------------- chart colours

export type ChartTokens = {
  ink: string;
  muted: string;
  faint: string;
  paper: string;
  grid: string;
  hairline: string;
};

/**
 * The neutrals a chart draws with, as values for the visitor's mode. The chart
 * library needs real colours, so it takes these rather than the CSS tokens;
 * the page redraws when the mode changes.
 */
export function useChartTokens(): ChartTokens {
  const palette = PALETTE[useSiteTheme().mode];
  return {
    ink: palette.ink,
    muted: palette.muted,
    faint: palette.faint,
    paper: palette.paper,
    grid: palette.grid,
    hairline: palette.hairlineStrong,
  };
}

/** A colour for the chart library: the ink token (Stellar's coin, a plain mark) as a value. */
export const chartColor = (color: string, tokens: ChartTokens) =>
  color === INK ? tokens.ink : color;

// ---------------------------------------------------------------------- formats

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fMoney = (value: number) =>
  fCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fMoneyShort = (value: number) =>
  fCurrency(value, { notation: 'compact', maximumFractionDigits: 1 });

/** "13 Nov 2026, 05:09 UTC", the same on the server and in every browser. */
export function fUtc(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

/** A bar's period in words: "13 Nov 2026", "Week of 9 Nov 2026", "Nov 2026". */
export function fBucket(time: number, bucket: Bucket): string {
  const d = new Date(time);
  const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (bucket === 'week') return `Week of ${day}`;
  if (bucket === 'month') return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return day;
}

export function fLogDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 16).replace('T', ' ');
}

export function shortAddress(value: string): string {
  return value.length > 16 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value;
}

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

/** Saves text as a file; the byte-order mark makes Excel read UTF-8. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(
    new Blob([BYTE_ORDER_MARK, csv], { type: 'text/csv;charset=utf-8' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------- the grid of cells

type Columns = { xs: number; sm?: number; md?: number };

const templateOf = (columns: Columns) => ({
  xs: `repeat(${columns.xs}, minmax(0, 1fr))`,
  ...(columns.sm && { sm: `repeat(${columns.sm}, minmax(0, 1fr))` }),
  ...(columns.md && { md: `repeat(${columns.md}, minmax(0, 1fr))` }),
});

/**
 * Cells that share their lines, across the column. Like the roadmap's board,
 * the lines are 1px gaps over the hairline colour, so they stay straight
 * whatever a cell holds; the grid reaches the frame lines and lets them be its
 * sides (GRID_FRAME_SX). Fill an unfinished last row with `HatchCell`s.
 */
export function CellGrid({
  columns,
  children,
  sx,
}: {
  columns: Columns;
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={[
        {
          ...GRID_FRAME_SX,
          display: 'grid',
          gap: '1px',
          bgcolor: HAIRLINE_COLOR,
          gridTemplateColumns: templateOf(columns),
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
}

type Span = { xs?: number; sm?: number; md?: number };

const spanOf = (span?: Span) =>
  span && {
    gridColumn: {
      ...(span.xs && { xs: `span ${span.xs}` }),
      ...(span.sm && { sm: `span ${span.sm}` }),
      ...(span.md && { md: `span ${span.md}` }),
    },
  };

/** One cell of a CellGrid: white, the gutter inside, nothing touching a line. */
export function Cell({
  span,
  children,
  sx,
}: {
  span?: Span;
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={[
        {
          ...GUTTER_SX,
          ...spanOf(span),
          minWidth: 0,
          py: { xs: 3, md: 4 },
          bgcolor: PAPER,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
}

/** An empty place in a CellGrid's last row: hatched, as the site fills its grids. */
export function HatchCell({ span }: { span?: Span }) {
  return (
    <Box aria-hidden="true" sx={{ ...spanOf(span), bgcolor: PAPER, ...HATCH_SX, minHeight: 48 }} />
  );
}

// ---------------------------------------------------------------------- a chapter's grid

/**
 * Every chapter of the dashboard sits on one grid, so its figures and its
 * charts share their lines: one column on phones, two on tablets, four on
 * wide screens. A chart takes half the row there (a whole row on tablets), a
 * wide chart the whole row; a figure a half or a quarter.
 */
export const CHAPTER_COLUMNS: Columns = { xs: 1, sm: 2, md: 4 };
export const SPAN = {
  chart: { sm: 2, md: 2 },
  wide: { sm: 2, md: 4 },
  half: { sm: 1, md: 2 },
  quarter: { sm: 1, md: 1 },
} as const satisfies Record<string, Span>;

// ---------------------------------------------------------------------- what a cell holds

/** A chart in its cell: its title and what it shows, a control opposite, the chart under. */
export function Panel({
  title,
  subheader,
  action,
  children,
  wide,
}: {
  title: string;
  subheader?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Cell span={wide ? SPAN.wide : SPAN.chart} sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'flex-start',
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h3" sx={{ ...TYPE.h4, color: INK }}>
            {title}
          </Typography>
          {subheader && (
            <Typography sx={{ ...TYPE.small, color: MUTED, mt: 1, maxWidth: 560 }}>
              {subheader}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Cell>
  );
}

/** A grid of panels on the chapter grid. */
export function PanelGrid({ children }: { children: ReactNode }) {
  return <CellGrid columns={CHAPTER_COLUMNS}>{children}</CellGrid>;
}

/** A figure in its cell: what it counts, the figure, and one line under it. */
export function Figure({
  label,
  value,
  foot,
  span,
}: {
  label: string;
  value: string;
  foot?: string;
  span?: Span;
}) {
  return (
    <Cell span={span}>
      <Typography component="p" sx={{ ...TYPE.caption, color: MUTED }}>
        {label}
      </Typography>
      <Typography
        component="p"
        sx={{
          ...TYPE.h3,
          mt: 0.75,
          color: INK,
          fontVariantNumeric: 'tabular-nums',
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
      {foot && (
        <Typography component="p" sx={{ ...TYPE.small, color: MUTED, mt: 1 }}>
          {foot}
        </Typography>
      )}
    </Cell>
  );
}

/** A filled notice in the highlight's wash (pending, not broken): words in its deep shade. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <Box
      role="status"
      sx={{
        ...TYPE.small,
        mt: 4,
        px: 2.5,
        py: 2,
        maxWidth: 600,
        bgcolor: BRAND_COLORS.yellow.tint,
        color: BRAND_COLORS.yellow.deep,
      }}
    >
      {children}
    </Box>
  );
}

export function NoData({ text = 'No data yet' }: { text?: string }) {
  return (
    <Box
      sx={{
        height: 240,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <Typography sx={{ ...TYPE.small, color: MUTED }}>{text}</Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------- the period switch

const PERIOD_SHORT: Record<PeriodKey, string> = {
  '7d': '7D',
  '30d': '30D',
  '90d': '90D',
  '12m': '12M',
  all: 'All',
};

/** A chart's own period, as the app's price ranges: 7D, 30D, 90D, 12M, All. */
export function PeriodSwitch({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
}) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={PERIODS.map((p) => ({
        value: p.key,
        label: (
          <>
            <Box component="span" aria-hidden="true">
              {PERIOD_SHORT[p.key]}
            </Box>
            <Box component="span" sx={VISUALLY_HIDDEN_SX}>
              {p.label}
            </Box>
          </>
        ),
      }))}
    />
  );
}

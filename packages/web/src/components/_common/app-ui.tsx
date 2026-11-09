'use client';

import type { ReactNode } from 'react';
import type { Theme, SxProps } from '@mui/material/styles';

import { formatNumberLocale } from '@/locales';
import { RouterLink } from '@/routes/components';
import { priceDomain } from '@/lib/prices/markets';
import { fTokenAmount, fCurrencyTwoDecimals } from '@/utils/format-number';
import {
  INK,
  HOVER,
  MUTED,
  PAPER,
  CANVAS,
  INK_SOFT,
  BRAND_COLORS,
  HAIRLINE_STRONG,
} from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';

import { HAIRLINE } from './brand';

// ----------------------------------------------------------------------

// The signed-in app's shared parts, in a bank's language: a white page, square
// boxes drawn with a hairline, ink words, and colour only where it means
// something (a rise, a failure, "pending"). The coins bring the rest.
// Rules: packages/web/DESIGN.md.

const sxList = (sx?: SxProps<Theme>) => (Array.isArray(sx) ? sx : [sx]);

/** The side padding inside a box: 20px on phones, 24px from tablets up. */
export const BOX_PX = { xs: '20px', md: '24px' } as const;

/** Money as people read it, two decimals: $1,240.18. */
export const formatUsd = (value: number) => fCurrencyTwoDecimals(value);

/**
 * A coin amount with its symbol, with as many decimals as it needs and no more:
 * 0.0142 BTC, 15 XLM, 1,200.5 USDC.
 */
export function formatCoin(amount: number, symbol: string) {
  const size = Math.abs(amount);
  const digits = size >= 1000 ? 2 : size >= 1 ? 4 : 6;
  return `${fTokenAmount(amount, { maximumFractionDigits: digits })} ${symbol}`;
}

/** Figures in the UI face with even-width digits, so columns of money line up. */
export const FIGURES = { fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' } as const;

/** What each asset is called in the app (lib/portfolio/asset-names.ts, one list). */
export { assetName, assetNoun, ASSET_NAMES } from '@/lib/portfolio/asset-names';

/**
 * The app's language for dates and times, the one its money is formatted in:
 * never the browser's, or an English page shows Slovenian dates.
 */
export const appLocale = () => formatNumberLocale().code ?? 'en-US';

/**
 * A coin's price: cents from a dollar up, four decimals under one ($0.2987).
 * Pass `digits` to print two prices alike ($0.9997 to $1.0002).
 */
export function formatPrice(value: number, digits = Math.abs(value) >= 1 ? 2 : 4) {
  return new Intl.NumberFormat(appLocale(), {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * Big money in short: $1.73T, $38.2B. The minimum is spelled out because
 * engines disagree on the default: some keep the dollar's two decimals in
 * compact notation and print $38.20B.
 */
export const formatCompactUsd = (value: number) =>
  new Intl.NumberFormat(appLocale(), {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

/** A big count in short: 19.95M. */
export const formatCompact = (value: number) =>
  new Intl.NumberFormat(appLocale(), { notation: 'compact', maximumFractionDigits: 2 }).format(
    value
  );

/** A 24-hour price change: green when up, grey when down, nothing when unknown. */
export function Change({ pct, sx }: { pct: number | null | undefined; sx?: SxProps<Theme> }) {
  if (pct == null || !Number.isFinite(pct)) return null;
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return (
    <Box
      component="span"
      sx={[{ ...FIGURES, color: pct > 0 ? BRAND_COLORS.mint.deep : MUTED }, ...sxList(sx)]}
    >
      {`${sign}${Math.abs(pct).toFixed(2)}%`}
    </Box>
  );
}

// ----------------------------------------------------------------------

type AppBlockProps = {
  title?: ReactNode;
  /** On the right of the title: "See all", a filter, a total. */
  action?: ReactNode;
  /** Rows run edge to edge: the box has no padding of its own. */
  flush?: boolean;
  /**
   * On phones the list sits on the page with no box, a line under each row
   * (Home's assets, Niko 2026-11-09, after the phone mockup). Boxed from tablets up.
   */
  openOnPhone?: boolean;
  children: ReactNode;
  sx?: SxProps<Theme>;
  'aria-label'?: string;
};

/**
 * A section of a page: its title above, then a square box drawn with a
 * hairline on the white page. No fill, no shadow: the line is the box.
 */
export function AppBlock({
  title,
  action,
  flush = false,
  openOnPhone = false,
  children,
  sx,
  ...other
}: AppBlockProps) {
  return (
    <Box component="section" sx={[{ minWidth: 0 }, ...sxList(sx)]} {...other}>
      {(title || action) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            minHeight: 40,
            mb: 1,
          }}
        >
          {title && (
            <Typography component="h2" sx={{ fontSize: 15, fontWeight: 500, color: INK_SOFT }}>
              {title}
            </Typography>
          )}
          {action}
        </Box>
      )}
      <Box
        sx={{
          border: openOnPhone ? { xs: 'none', md: HAIRLINE } : HAIRLINE,
          bgcolor: PAPER,
          ...(!flush && { px: BOX_PX, py: BOX_PX }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** "See all" beside a section's title. */
export function SeeAll({ href, children = 'See all' }: { href: string; children?: ReactNode }) {
  return (
    <ButtonBase
      component={RouterLink}
      href={href}
      sx={{
        gap: 0.25,
        px: 0.75,
        py: 0.5,
        mr: -0.75,
        fontSize: 14,
        fontWeight: 500,
        color: INK,
        '&:hover': { bgcolor: HOVER },
      }}
    >
      {children}
      <ChevronRightRounded sx={{ fontSize: 18 }} />
    </ButtonBase>
  );
}

/**
 * The rows of a list, with a hairline between each two. The selector has to
 * outrank a row's own styles: a clickable row is MUI's ButtonBase, which
 * resets its border to 0, and a plain `* + *` lost to that, so linked rows
 * had no lines between them.
 */
export const ROW_LINES = { '& > :not(:first-child)': { borderTop: HAIRLINE } } as const;

export function RowList({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return <Box sx={[ROW_LINES, ...sxList(sx)]}>{children}</Box>;
}

type ListRowProps = {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  detail?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** A badge after the title: pending, failed. */
  badge?: ReactNode;
};

/**
 * One row of a list: what it is on the left, the figures on the right. The
 * whole row is the link when it leads somewhere.
 */
export function ListRow({
  icon,
  title,
  subtitle,
  value,
  detail,
  href,
  onClick,
  badge,
}: ListRowProps) {
  const clickable = !!(href || onClick);
  const link = href ? { component: RouterLink, href } : { onClick };

  const body = (
    <>
      <Box sx={{ display: 'flex', flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* The badge sits beside the title while both fit, and drops under it
            when they don't (a phone row), so the title is never cut short to
            make room for "Pending" or "Action needed". */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            columnGap: 1,
            rowGap: 0.5,
            minWidth: 0,
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: 15,
              fontWeight: 500,
              color: INK,
              minWidth: 0,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>
          {badge}
        </Box>
        {subtitle && (
          <Typography
            component="span"
            sx={{
              display: 'block',
              mt: '2px',
              fontSize: 13.5,
              color: MUTED,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {(value || detail) && (
        <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
          {value && (
            <Typography
              component="span"
              sx={{ ...FIGURES, display: 'block', fontSize: 15, fontWeight: 500, color: INK }}
            >
              {value}
            </Typography>
          )}
          {detail && (
            <Typography
              component="span"
              sx={{ ...FIGURES, display: 'block', mt: '2px', fontSize: 13.5, color: MUTED }}
            >
              {detail}
            </Typography>
          )}
        </Box>
      )}
    </>
  );

  const rowSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 1.75,
    width: '100%',
    minHeight: 68,
    px: BOX_PX,
    py: 1.5,
    textAlign: 'left',
  } as const;

  return clickable ? (
    <ButtonBase {...link} sx={{ ...rowSx, '&:hover': { bgcolor: HOVER } }}>
      {body}
    </ButtonBase>
  ) : (
    <Box sx={rowSx}>{body}</Box>
  );
}

/** A round grey icon at the start of a row: what kind of thing it is. No colour. */
export function RowIcon({ children, size = 40 }: { children: ReactNode; size?: number }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        color: INK,
        bgcolor: CANVAS,
        '& svg': { fontSize: Math.round(size * 0.5) },
      }}
    >
      {children}
    </Box>
  );
}

/** A small status word after a row's title: pending, failed, refunded. */
export function StatusBadge({
  tone,
  children,
}: {
  tone: 'pending' | 'failed';
  children: ReactNode;
}) {
  const colors =
    tone === 'pending'
      ? { color: BRAND_COLORS.yellow.deep, bgcolor: BRAND_COLORS.yellow.tint }
      : { color: '#B91C1C', bgcolor: 'rgba(185,28,28,0.08)' };
  return (
    <Box
      component="span"
      sx={{
        flexShrink: 0,
        px: '6px',
        py: '1px',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.5,
        ...colors,
      }}
    >
      {children}
    </Box>
  );
}

// ----------------------------------------------------------------------

/**
 * A page's main figure: its label, the number at display size, a line under
 * it. Plain ink on white: the biggest thing on the page is the money.
 */
export function Headline({
  label,
  value,
  note,
  aside,
  loading = false,
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  /** On the label's line, at the far end: the rate on Savings. */
  aside?: ReactNode;
  loading?: boolean;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}
      >
        <Typography sx={{ fontSize: 14, color: MUTED }}>{label}</Typography>
        {aside}
      </Box>
      {loading ? (
        <Skeleton
          variant="text"
          sx={{ width: 260, maxWidth: '100%', fontSize: { xs: 40, md: 48 } }}
        />
      ) : (
        <Typography
          sx={{
            ...FIGURES,
            mt: 0.75,
            fontSize: { xs: 40, md: 48 },
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: '-0.035em',
            color: INK,
          }}
        >
          {value}
        </Typography>
      )}
      {note && !loading && (
        <Typography component="div" sx={{ ...FIGURES, mt: 1, fontSize: 14, color: MUTED }}>
          {note}
        </Typography>
      )}
    </Box>
  );
}

/**
 * A square button with an icon and a word: the actions beside a page's main
 * figure. One is ink (the main action); the rest are outlined.
 */
export function ActionButton({
  icon,
  label,
  shortLabel,
  onClick,
  href,
  primary = false,
}: {
  icon: ReactNode;
  label: string;
  /** On phones, where the buttons are narrow: "Add" for "Add money". */
  shortLabel?: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
}) {
  const link = href ? { component: RouterLink, href } : { onClick };
  return (
    <ButtonBase
      {...link}
      sx={{
        gap: 0.75,
        height: 40,
        px: 1.75,
        minWidth: 0,
        fontSize: 14,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        border: `1px solid ${primary ? INK : HAIRLINE_STRONG}`,
        color: primary ? PAPER : INK,
        bgcolor: primary ? INK : PAPER,
        '& svg': { fontSize: 18 },
        '&:hover': { bgcolor: primary ? INK_SOFT : HOVER },
        '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
      }}
    >
      {icon}
      {shortLabel ? (
        <>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
            {shortLabel}
          </Box>
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {label}
          </Box>
        </>
      ) : (
        label
      )}
    </ButtonBase>
  );
}

/** A page's action buttons in a row; on phones they share the width. */
export function ActionRow({ children, count }: { children: ReactNode; count: number }) {
  const columns = count === 6 ? 3 : 2;
  return (
    <Box
      sx={{
        display: { xs: 'grid', sm: 'flex' },
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        flexWrap: 'wrap',
        gap: 1,
        // An odd count: the main button takes the first row on its own.
        ...(count % 2 === 1 && { '& > :first-child': { gridColumn: '1 / -1' } }),
      }}
    >
      {children}
    </Box>
  );
}

/**
 * One of Home's ways to move money: a square tile on the grey canvas, its icon
 * above its word (Niko 2026-11-09, after the phone mockup). All four are equal:
 * nothing ink, no outline until the pointer is on it.
 */
export function ActionTile({
  icon,
  label,
  onClick,
  href,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const link = href ? { component: RouterLink, href } : { onClick };
  return (
    <ButtonBase
      {...link}
      sx={{
        flexDirection: 'column',
        gap: 0.75,
        height: { xs: 68, md: 72 },
        minWidth: 0,
        px: 1,
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        color: INK,
        bgcolor: CANVAS,
        border: '1px solid transparent',
        '& svg': { fontSize: 22 },
        '&:hover': { borderColor: HAIRLINE_STRONG },
        '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
      }}
    >
      {/* A fixed slot for the icon, so every word sits on one line whatever
          the glyph's own height (a button and a link alike). */}
      <Box component="span" sx={{ display: 'flex', alignItems: 'center', height: 24 }}>
        {icon}
      </Box>
      <Box component="span" sx={{ lineHeight: '18px' }}>
        {label}
      </Box>
    </ButtonBase>
  );
}

/** Home's tiles: one row of four at every width, fixed tiles beside the balance on wide screens. */
export function ActionTiles({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(4, 104px)' },
        gap: 1,
      }}
    >
      {children}
    </Box>
  );
}

export type Stat = { key: string; label: string; value: ReactNode; note?: ReactNode };

/**
 * Figures side by side across a box, divided by hairlines: where the money
 * is, what Savings pays. Two to a row on phones; an odd last one takes the row.
 */
export function StatStrip({ items, loading = false }: { items: Stat[]; loading?: boolean }) {
  const odd = items.length % 2 === 1;
  return (
    <Box
      component="dl"
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          md: `repeat(${items.length}, minmax(0, 1fr))`,
        },
        m: 0,
      }}
    >
      {items.map((item, index) => (
        <Box
          key={item.key}
          sx={{
            minWidth: 0,
            px: BOX_PX,
            py: 2,
            gridColumn: { xs: odd && index === items.length - 1 ? '1 / -1' : 'auto', md: 'auto' },
            borderTop: { xs: index > 1 ? HAIRLINE : 'none', md: 'none' },
            borderLeft: {
              xs: index % 2 === 1 ? HAIRLINE : 'none',
              md: index > 0 ? HAIRLINE : 'none',
            },
          }}
        >
          <Typography component="dt" sx={{ fontSize: 13.5, color: MUTED }}>
            {item.label}
          </Typography>
          <Typography
            component="dd"
            sx={{ ...FIGURES, m: 0, mt: 0.5, fontSize: 18, fontWeight: 500, color: INK }}
          >
            {loading ? <Skeleton variant="text" width={96} /> : item.value}
          </Typography>
          {item.note && !loading && (
            <Typography
              component="dd"
              sx={{ ...FIGURES, m: 0, mt: 0.25, fontSize: 13, color: MUTED }}
            >
              {item.note}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

/**
 * The box at the top of a page: its main figure (`Headline`) with the page's
 * actions beside it, then under a hairline the figures that break it down.
 */
export function SummaryBlock({
  children,
  actions,
  stats,
  loading = false,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  actions?: ReactNode;
  stats?: Stat[];
  loading?: boolean;
  'aria-label'?: string;
}) {
  return (
    <Box component="section" aria-label={ariaLabel} sx={{ border: HAIRLINE, bgcolor: PAPER }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            lg: actions ? 'minmax(0, 1fr) auto' : '1fr',
          },
          alignItems: 'end',
          gap: 3,
          px: BOX_PX,
          py: { xs: '20px', md: '28px' },
        }}
      >
        <Box sx={{ minWidth: 0 }}>{children}</Box>
        {actions}
      </Box>
      {!!stats?.length && (
        <Box sx={{ borderTop: HAIRLINE }}>
          <StatStrip items={stats} loading={loading} />
        </Box>
      )}
    </Box>
  );
}

/**
 * A small price line with no axes: a coin's last 24 hours in its own colour,
 * over a dashed line at the price the day began with, so up or down reads at a
 * glance. A coin that barely moved draws flat (`priceDomain`).
 */
export function Sparkline({
  points,
  color,
  label,
  minSpan,
  height = 32,
  wash,
}: {
  points: number[];
  color: string;
  /** What the line says, for screen readers. */
  label: string;
  /** The least range drawn, as a share of the price (`minSpanFor`). */
  minSpan?: number;
  height?: number;
  /** A faint flat fill under the line (never a gradient): a bigger line's weight. */
  wash?: string;
}) {
  if (points.length < 2) return <Box aria-hidden="true" sx={{ height }} />;

  const { min, max } = priceDomain(points, minSpan);
  const inset = 3;
  const y = (v: number) => inset + ((max - v) / (max - min)) * (height - inset * 2);
  const path = points
    .map(
      (v, i) => `${i ? 'L' : 'M'}${((i / (points.length - 1)) * 100).toFixed(2)} ${y(v).toFixed(2)}`
    )
    .join(' ');

  return (
    <Box role="img" aria-label={label} sx={{ position: 'relative', height }}>
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: Math.round(y(points[0])),
          borderTop: `1px dashed ${HAIRLINE_STRONG}`,
        }}
      />
      <svg
        aria-hidden="true"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        style={{ position: 'relative', display: 'block', overflow: 'visible' }}
      >
        {wash && <path d={`${path} L100 ${height} L0 ${height} Z`} fill={wash} stroke="none" />}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Box>
  );
}

/** Words for a price line: "up 2.10% in the last 24 hours". */
export function moveLabel(points: number[], span = 'in the last 24 hours') {
  if (points.length < 2 || !points[0]) return `No price ${span}`;
  const pct = ((points[points.length - 1] - points[0]) / points[0]) * 100;
  return `${pct >= 0 ? 'Up' : 'Down'} ${Math.abs(pct).toFixed(2)}% ${span}`;
}

/** Rows that stand in for a list while it loads. */
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Box sx={{ px: BOX_PX, py: 1 }}>
      {Array.from({ length: rows }, (_, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.75, py: 1.5 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="25%" />
          </Box>
          <Skeleton variant="text" width={72} />
        </Box>
      ))}
    </Box>
  );
}

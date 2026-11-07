'use client';

import type { ReactNode } from 'react';
import type { Theme, SxProps } from '@mui/material/styles';

import { formatNumberLocale } from '@/locales';
import { RouterLink } from '@/routes/components';
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

/** What each asset is called in the app, for people who don't know crypto. */
export const ASSET_NAMES: Record<string, { name: string; ticker: string }> = {
  USDC: { name: 'Digital dollars', ticker: 'USDC' },
  XLM: { name: 'Stellar', ticker: 'XLM' },
  BTC: { name: 'Bitcoin', ticker: 'BTC' },
  ETH: { name: 'Ethereum', ticker: 'ETH' },
  SOL: { name: 'Solana', ticker: 'SOL' },
};

export const assetName = (symbol: string) => ASSET_NAMES[symbol]?.name ?? symbol;

/** The same name inside a sentence: "Received digital dollars", "Received Bitcoin". */
export const assetNoun = (symbol: string) =>
  symbol === 'USDC' ? 'digital dollars' : assetName(symbol);

/**
 * The app's language for dates and times, the one its money is formatted in:
 * never the browser's, or an English page shows Slovenian dates.
 */
export const appLocale = () => formatNumberLocale().code ?? 'en-US';

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
  children: ReactNode;
  sx?: SxProps<Theme>;
  'aria-label'?: string;
};

/**
 * A section of a page: its title above, then a square box drawn with a
 * hairline on the white page. No fill, no shadow: the line is the box.
 */
export function AppBlock({ title, action, flush = false, children, sx, ...other }: AppBlockProps) {
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
          border: HAIRLINE,
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

/** The rows of a list, with a hairline between each two. */
export function RowList({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return <Box sx={[{ '& > * + *': { borderTop: HAIRLINE } }, ...sxList(sx)]}>{children}</Box>;
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography
            component="span"
            sx={{
              fontSize: 15,
              fontWeight: 500,
              color: INK,
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
  return (
    <Box
      sx={{
        display: { xs: 'grid', sm: 'flex' },
        gridTemplateColumns: `repeat(${count === 4 ? 2 : Math.min(count, 3)}, minmax(0, 1fr))`,
        flexWrap: 'wrap',
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
            <Typography component="dd" sx={{ ...FIGURES, m: 0, mt: 0.25, fontSize: 13, color: MUTED }}>
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
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: actions ? 'minmax(0, 1fr) auto' : '1fr' },
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

'use client';

import type { ReactNode } from 'react';

import { RouterLink } from '@/routes/components';
import { INK, HOVER, MUTED, CANVAS, INK_SOFT } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import {
  BOX_PX,
  Change,
  FIGURES,
  ROW_LINES,
  Sparkline,
  formatUsd,
  moveLabel,
  formatPrice,
  formatCompactUsd,
} from './app-ui';

// ----------------------------------------------------------------------

// What someone holds, as a table a bank would print: the asset, its price and
// how it moved today, a 24-hour line in the coin's colour, its market cap, and
// what the holding is worth. Columns drop away as the screen narrows, never
// squeeze: phones keep the asset and its value.

export type Holding = {
  key: string;
  href: string;
  icon: ReactNode;
  name: string;
  /** Beside the price columns: the ticker, and on two-wallet accounts the wallets. */
  ticker: string;
  /** What is held: "0.0142 BTC"; for Savings, what it earns. */
  amount: string;
  value: number;
  /** Null for Savings, which has no price. */
  price: number | null;
  change24h: number | null;
  /** A digital dollar: its daily change is noise, so the compact row leaves it out. */
  stable?: boolean;
  sparkline: number[];
  /** The least range its line spans (`minSpanFor`): a digital dollar draws flat. */
  minSpan?: number;
  color: string;
  marketCap: number | null;
  /** Its share of what the table shows, 0 to 1 (Home's share column). */
  share?: number;
  /** Its colour in the ring beside the balance, by its share: the ring's legend. */
  swatch?: string;
  rank: number | null;
};

export type HoldingGroup = {
  key: string;
  title: string;
  note?: string;
  total: number;
  rows: Holding[];
};

type Variant = 'full' | 'compact' | 'home';

// The columns at each width. Compact (Home) stops at the sparkline; full (Assets)
// adds the price from tablets and the market cap from laptops.
const COLUMNS: Record<Variant, Record<string, string>> = {
  compact: {
    xs: 'minmax(0, 1fr) auto',
    sm: 'minmax(0, 1fr) 88px minmax(104px, auto)',
  },
  // Home at full width: the price (what one coin is worth now) and each
  // holding's share of the person's money take the market cap's place.
  home: {
    xs: 'minmax(0, 1fr) auto',
    sm: 'minmax(0, 1fr) 88px minmax(104px, auto)',
    md: 'minmax(0, 1.6fr) minmax(0, 1fr) 112px minmax(0, 0.7fr) minmax(0, 1fr)',
  },
  full: {
    xs: 'minmax(0, 1fr) auto',
    sm: 'minmax(0, 1fr) 88px minmax(104px, auto)',
    md: 'minmax(0, 1.5fr) minmax(0, 1fr) 96px minmax(0, 1fr)',
    lg: 'minmax(0, 1.7fr) minmax(0, 1fr) 112px minmax(0, 0.9fr) minmax(0, 1.1fr)',
  },
};

const rowGrid = (variant: Variant) => ({
  display: 'grid',
  gridTemplateColumns: COLUMNS[variant],
  alignItems: 'center',
  columnGap: { xs: 2, md: 3 },
  px: BOX_PX,
});

/** Shown from tablets (sparkline), from laptops-ish (price), from desktops (market cap). */
const from = (breakpoint: 'sm' | 'md' | 'lg') => ({
  display: { xs: 'none', [breakpoint]: 'block' },
});

// On the full table the wide layout moves the amount under the value and puts
// the ticker under the name; phones (and Home) keep the amount by the name.
const tabled = (variant: Variant) => variant !== 'compact';
const wideOnly = (variant: Variant) =>
  tabled(variant) ? { display: { xs: 'none', md: 'inline' } } : { display: 'none' };
const narrowOnly = (variant: Variant) =>
  tabled(variant) ? { display: { xs: 'inline', md: 'none' } } : { display: 'inline' };

const SUB = { display: 'block', mt: '2px', fontSize: 13.5, color: MUTED } as const;
const MAIN = { ...FIGURES, display: 'block', fontSize: 15, fontWeight: 500, color: INK } as const;

function HeaderRow({ variant }: { variant: Variant }) {
  const label = { fontSize: 12.5, fontWeight: 500, color: MUTED } as const;
  return (
    <Box
      aria-hidden="true"
      className="nf-row"
      sx={{
        ...rowGrid(variant),
        py: 1.25,
        // Home on a phone is two columns that need no names: the first screen
        // is for the assets themselves (Niko 2026-11-09).
        ...(variant === 'home' && { display: { xs: 'none', md: 'grid' } }),
      }}
    >
      <Typography sx={label}>Asset</Typography>
      {tabled(variant) && (
        <Typography sx={{ ...label, ...from('md'), textAlign: 'right' }}>Price</Typography>
      )}
      <Typography sx={{ ...label, ...from('sm'), textAlign: 'center' }}>24h</Typography>
      {variant === 'full' && (
        <Typography sx={{ ...label, ...from('lg'), textAlign: 'right' }}>Market cap</Typography>
      )}
      {variant === 'home' && (
        <Typography sx={{ ...label, ...from('md'), textAlign: 'right' }}>Share</Typography>
      )}
      <Typography sx={{ ...label, textAlign: 'right' }}>Value</Typography>
    </Box>
  );
}

function GroupRow({ group }: { group: HoldingGroup }) {
  return (
    <Box
      className="nf-group"
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 2,
        px: BOX_PX,
        py: 1,
        bgcolor: CANVAS,
      }}
    >
      <Typography component="h3" sx={{ fontSize: 13.5, fontWeight: 500, color: INK_SOFT }}>
        {group.title}
        {group.note && (
          <Box
            component="span"
            sx={{ display: { xs: 'none', sm: 'inline' }, ml: 1.25, fontWeight: 400, color: MUTED }}
          >
            {group.note}
          </Box>
        )}
      </Typography>
      <Typography sx={{ ...FIGURES, fontSize: 13.5, fontWeight: 500, color: INK_SOFT }}>
        {formatUsd(group.total)}
      </Typography>
    </Box>
  );
}

function HoldingRow({ row, variant }: { row: Holding; variant: Variant }) {
  const change = row.price !== null && !row.stable ? <Change pct={row.change24h} /> : null;

  return (
    <ButtonBase
      component={RouterLink}
      href={row.href}
      className="nf-row"
      sx={{
        ...rowGrid(variant),
        width: '100%',
        // Home on a phone: a 40px coin with 10px above and below, so more of
        // the list fits on the first screen.
        minHeight: variant === 'home' ? { xs: 60, md: 68 } : 68,
        py: variant === 'home' ? { xs: 1.25, md: 1.5 } : 1.5,
        textAlign: 'left',
        '&:hover': { bgcolor: HOVER },
      }}
    >
      {/* The asset */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, minWidth: 0 }}>
        <Box sx={{ display: 'flex', flexShrink: 0 }}>{row.icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="span"
            sx={{ ...MAIN, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {row.name}
          </Typography>
          <Typography
            component="span"
            sx={{ ...SUB, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            <Box component="span" sx={narrowOnly(variant)}>
              {row.amount}
            </Box>
            <Box component="span" sx={wideOnly(variant)}>
              {row.ticker}
            </Box>
          </Typography>
        </Box>
      </Box>

      {/* Price, and how it moved today */}
      {tabled(variant) && (
        <Box sx={{ ...from('md'), textAlign: 'right' }}>
          {row.price !== null && (
            <>
              <Typography component="span" sx={MAIN}>
                {formatPrice(row.price)}
              </Typography>
              <Typography component="span" sx={{ ...SUB, ...FIGURES }}>
                <Change pct={row.change24h} />
              </Typography>
            </>
          )}
        </Box>
      )}

      {/* The last 24 hours */}
      <Box sx={from('sm')}>
        {row.price !== null && (
          <Sparkline
            points={row.sparkline}
            color={row.color}
            minSpan={row.minSpan}
            label={`${row.name}: ${moveLabel(row.sparkline).toLowerCase()}`}
          />
        )}
      </Box>

      {/* Market cap, and its rank among all coins */}
      {variant === 'full' && (
        <Box sx={{ ...from('lg'), textAlign: 'right' }}>
          {row.marketCap !== null && (
            <>
              <Typography component="span" sx={MAIN}>
                {formatCompactUsd(row.marketCap)}
              </Typography>
              {row.rank !== null && (
                <Typography component="span" sx={{ ...SUB, ...FIGURES }}>
                  {`#${row.rank}`}
                </Typography>
              )}
            </>
          )}
        </Box>
      )}

      {/* Its share of the person's money (Home) */}
      {variant === 'home' && (
        <Box sx={{ ...from('md'), textAlign: 'right' }}>
          {row.share !== undefined && (
            <Typography
              component="span"
              sx={{ ...MAIN, display: 'inline-flex', alignItems: 'center', gap: 1 }}
            >
              {row.swatch && (
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.swatch }}
                />
              )}
              {row.share < 0.01 && row.share > 0 ? '<1%' : `${Math.round(row.share * 100)}%`}
            </Typography>
          )}
        </Box>
      )}

      {/* What it is worth */}
      <Box sx={{ textAlign: 'right', minWidth: 0 }}>
        <Typography component="span" sx={MAIN}>
          {formatUsd(row.value)}
        </Typography>
        <Typography component="span" sx={{ ...SUB, ...FIGURES, whiteSpace: 'nowrap' }}>
          <Box component="span" sx={narrowOnly(variant)}>
            {change}
          </Box>
          <Box component="span" sx={wideOnly(variant)}>
            {row.amount}
          </Box>
        </Typography>
      </Box>
    </ButtonBase>
  );
}

/**
 * The holdings, one row each. `groups` puts a heading over each group (digital
 * dollars, crypto, savings) with its total; `rows` is one plain list. The full
 * table has a header row; the compact one does not, nor Home on a phone. Inside
 * an open AppBlock (every page's lists) the rows sit on the page, a line under
 * each, and the headings are plain words; inside a box, a grey band.
 */
export function HoldingsTable({
  variant = 'full',
  groups,
  rows,
}: {
  variant?: Variant;
  groups?: HoldingGroup[];
  rows?: Holding[];
}) {
  // Home's share column: each holding against everything shown.
  if (variant === 'home' && rows) {
    const total = rows.reduce((sum, r) => sum + (Number.isFinite(r.value) ? r.value : 0), 0);
    rows = rows.map((r) => ({ ...r, share: total > 0 ? r.value / total : undefined }));
  }
  return (
    <Box sx={ROW_LINES}>
      {tabled(variant) && <HeaderRow variant={variant} />}
      {groups
        ? groups.flatMap((group) => [
            <GroupRow key={`group-${group.key}`} group={group} />,
            ...group.rows.map((row) => <HoldingRow key={row.key} row={row} variant={variant} />),
          ])
        : rows?.map((row) => <HoldingRow key={row.key} row={row} variant={variant} />)}
    </Box>
  );
}

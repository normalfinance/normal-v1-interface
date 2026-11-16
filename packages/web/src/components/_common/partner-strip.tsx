'use client';

import { cdn } from '@/utils/cdn';
import { ease } from '@/theme/motion';
import { TYPE } from '@/theme/type-scale';
import { SITE_THEME_ATTR } from '@/theme/site-theme';
import { INK, HOVER, MUTED, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

// Who stands behind Normal, what Savings is built on and who checked it, as
// their marks: one strip of cells, the way customer.io shows the brands that
// trust it. The same strip on the home page and on About (Niko 2026-11-16: the
// home page showed only three of them). The files are dark on transparent,
// drawn white in dark mode; heights are set by eye so every mark carries the
// same weight, and each sits in a box of one height so the labels line up.

export type Partner = {
  label: string;
  name: string;
  src: string;
  /**
   * The owner's own version for dark backgrounds. A partner whose rules forbid
   * recolouring its mark (Circle's Brand Use Policy: "Do not modify ...
   * including changing any colors") gets its white file here instead of the
   * white-out filter the others take.
   */
  srcDark?: string;
  height: number;
  href: string;
};

export const PARTNERS: Partner[] = [
  {
    label: 'Backed by',
    name: 'Stellar',
    src: cdn('homepage/stellar-logo.webp'),
    height: 34,
    href: 'https://stellar.org/',
  },
  {
    label: 'Backed by',
    name: 'Draper University',
    src: cdn('homepage/draper-university.webp'),
    height: 48,
    href: 'https://draperuniversity.com/',
  },
  {
    label: 'Backed by',
    name: 'Draper University Ventures',
    src: cdn('homepage/draper-university-ventures.webp'),
    height: 44,
    href: 'https://draperuniversity.com/ventures',
  },
  {
    // Normal's listing in the Circle Alliance Directory (2026-11-16). Circle's
    // own logo files (circle.com/pressroom brand kit, 2024), unmodified.
    // Under it, Circle's wordmark: together they read "Circle Alliance member",
    // on one line at every width.
    label: 'Alliance member',
    name: 'Circle',
    src: '/partners/circle-logo-licorice.svg',
    srcDark: '/partners/circle-logo-white.svg',
    height: 26,
    href: 'https://partners.circle.com/partner/normal-finance',
  },
  {
    label: 'Savings powered by',
    name: 'Blend Capital',
    src: cdn('homepage/blend-capital.png'),
    height: 38,
    href: 'https://blend.capital/',
  },
  {
    label: 'Savings powered by',
    name: 'DeFindex',
    src: cdn('homepage/defiindex.png'),
    height: 46,
    href: 'https://www.defindex.io/',
  },
  {
    label: 'Savings audited by',
    name: 'Halborn',
    src: cdn('homepage/halborn-logo.webp'),
    height: 17,
    href: 'https://www.halborn.com/',
  },
];

const LOGO_BOX = Math.max(...PARTNERS.map((partner) => partner.height));

/** Cells per row at each width: two on phones, four on tablets, all of them on a wide screen. */
const COLS = { xs: 2, sm: 4, lg: PARTNERS.length } as const;

const HAIRLINE = `1px solid ${HAIRLINE_COLOR}`;

function Mark({ partner }: { partner: Partner }) {
  const img = (src: string, theme: 'light' | 'dark' | 'both') => (
    <Box
      component="img"
      src={src}
      alt={theme === 'dark' ? '' : partner.name}
      loading="lazy"
      sx={{
        display: theme === 'dark' ? 'none' : 'block',
        width: 'auto',
        height: partner.height,
        maxWidth: '100%',
        objectFit: 'contain',
        [`html[${SITE_THEME_ATTR}="dark"] &`]:
          theme === 'both'
            ? { filter: 'brightness(0) invert(1)', opacity: 0.88 }
            : { display: theme === 'dark' ? 'block' : 'none' },
      }}
    />
  );

  if (!partner.srcDark) return img(partner.src, 'both');
  return (
    <>
      {img(partner.src, 'light')}
      {img(partner.srcDark, 'dark')}
    </>
  );
}

/**
 * The strip itself: a list of linked cells, no outer border (the frame lines
 * are its sides; the section around it draws the lines above and below).
 */
export function PartnerStrip() {
  return (
    <Box
      component="ul"
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `repeat(${COLS.xs}, 1fr)`,
          sm: `repeat(${COLS.sm}, 1fr)`,
          lg: `repeat(${COLS.lg}, 1fr)`,
        },
        m: 0,
        p: 0,
        listStyle: 'none',
      }}
    >
      {PARTNERS.map((partner, index) => (
        <Box
          component="li"
          key={partner.name}
          sx={{
            display: 'flex',
            // Two to a row on phones: an odd last cell takes the whole row.
            gridColumn: {
              xs: index === PARTNERS.length - 1 && PARTNERS.length % COLS.xs ? 'span 2' : 'auto',
              sm: 'auto',
            },
            // A line above every row but the first, and between the cells of a row.
            borderTop: {
              xs: index >= COLS.xs ? HAIRLINE : 'none',
              sm: index >= COLS.sm ? HAIRLINE : 'none',
              lg: 'none',
            },
            borderLeft: {
              xs: index % COLS.xs > 0 ? HAIRLINE : 'none',
              sm: index % COLS.sm > 0 ? HAIRLINE : 'none',
              lg: index > 0 ? HAIRLINE : 'none',
            },
          }}
        >
          <Box
            component="a"
            href={partner.href}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              minWidth: 0,
              minHeight: { xs: 136, md: 168 },
              px: { xs: 2, sm: 3 },
              py: 4,
              color: 'inherit',
              textAlign: 'center',
              textDecoration: 'none',
              transition: ease('background-color', 'quick'),
              '&:hover': { bgcolor: HOVER },
              '&:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: -2 },
            }}
          >
            <Typography component="span" sx={{ ...TYPE.caption, color: MUTED }}>
              {partner.label}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: '100%',
                height: LOGO_BOX,
              }}
            >
              <Mark partner={partner} />
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

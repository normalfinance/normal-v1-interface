'use client';

import { cdn } from '@/utils/cdn';
import { TYPE } from '@/theme/type-scale';
import { SITE_THEME_ATTR } from '@/theme/site-theme';
import { INK, HOVER, MUTED } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { HAIRLINE, COLUMN_SX } from '@/components/_common/brand';

// ----------------------------------------------------------------------

// Who stands behind Normal and what Savings is built on, as their marks: one
// strip of cells under the mission, like the backers on the home page. The files
// are dark on transparent (CDN homepage/), drawn white in dark mode. Heights
// are set by eye so every mark carries the same weight; each sits in a box of
// one height, so the labels above them line up.
const PARTNERS = [
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

export function AboutPartners() {
  return (
    <Box component="section" aria-label="Backers and partners" sx={{ borderTop: HAIRLINE }}>
      <Box
        component="ul"
        sx={{
          ...COLUMN_SX,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
        }}
      >
        {PARTNERS.map((partner, index) => (
          <Box
            component="li"
            key={partner.name}
            sx={{
              display: 'flex',
              // Two, three or six to a row: a line above every row but the
              // first, and between the cells of a row. The frame lines are the
              // strip's sides.
              borderTop: {
                xs: index >= 2 ? HAIRLINE : 'none',
                sm: index >= 3 ? HAIRLINE : 'none',
                md: 'none',
              },
              borderLeft: {
                xs: index % 2 === 1 ? HAIRLINE : 'none',
                sm: index % 3 > 0 ? HAIRLINE : 'none',
                md: index > 0 ? HAIRLINE : 'none',
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
                textDecoration: 'none',
                transition: 'background-color 150ms ease',
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
                <Box
                  component="img"
                  src={partner.src}
                  alt={partner.name}
                  loading="lazy"
                  sx={{
                    display: 'block',
                    width: 'auto',
                    height: partner.height,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    [`html[${SITE_THEME_ATTR}="dark"] &`]: {
                      filter: 'brightness(0) invert(1)',
                      opacity: 0.88,
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

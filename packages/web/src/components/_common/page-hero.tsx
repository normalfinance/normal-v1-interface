'use client';

import type { ReactNode } from 'react';

import { TYPE } from '@/theme/type-scale';
import { COLUMN_SX, GUTTER_SX } from '@/theme/site-grid';
import { INK, MUTED, INK_SOFT } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Eyebrow, HAIRLINE } from './brand';

// ----------------------------------------------------------------------

export type PageFact = { label: string; value: ReactNode };

/**
 * The facts strip's columns. Beside an aside the strip keeps the hero's 7:5
 * split, so the line along the aside's edge runs straight down through it: the
 * last fact sits under the aside and the rest share the words' side.
 */
const factColumns = (count: number, aside: boolean) =>
  aside && count > 1 ? `repeat(${count - 1}, ${7 / (count - 1)}fr) 5fr` : `repeat(${count}, 1fr)`;

type PageHeroProps = {
  /** The h1's id, for the section's aria-labelledby. */
  id: string;
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  /** BrandButtons, side by side (stacked on phones). */
  actions?: ReactNode;
  /**
   * The right-hand cell: a photo or a card that fills it, edge to edge. Give
   * a photo `position: absolute; inset: 0`. Without it the words take the
   * whole column.
   */
  aside?: ReactNode;
  /** Figures under the words, as a strip of cells across the column. */
  facts?: PageFact[];
  /** Legal, error and notice pages: the title at section size, not display. */
  compact?: boolean;
};

/**
 * The top of every page but home and About (both open on a photo): words on
 * the left of the column, an optional visual filling the right-hand cell, and
 * optional facts as a strip of cells underneath. White, on the hairline grid,
 * like the rest of the site; the title is the page's one h1. The section
 * after it draws the line between them (PageSection divider).
 */
export function PageHero({
  id,
  eyebrow,
  title,
  lede,
  actions,
  aside,
  facts,
  compact = false,
}: PageHeroProps) {
  return (
    <Box component="section" aria-labelledby={id}>
      <Box sx={COLUMN_SX}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: aside ? '7fr 5fr' : '1fr' },
          }}
        >
          <Box sx={{ ...GUTTER_SX, py: compact ? { xs: 6, md: 9 } : 'var(--section-y)' }}>
            {eyebrow && <Eyebrow sx={{ mb: 2 }}>{eyebrow}</Eyebrow>}
            <Typography
              id={id}
              component="h1"
              sx={{ ...(compact ? TYPE.h2 : TYPE.display), maxWidth: 960, color: INK }}
            >
              {title}
            </Typography>
            {lede && (
              <Typography sx={{ ...TYPE.lead, mt: 3, maxWidth: 600, color: INK_SOFT }}>
                {lede}
              </Typography>
            )}
            {actions && (
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 4 }}>
                {actions}
              </Stack>
            )}
          </Box>

          {aside && (
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                minHeight: { xs: 320, md: 'auto' },
                borderTop: { xs: HAIRLINE, md: 'none' },
                borderLeft: { md: HAIRLINE },
              }}
            >
              {aside}
            </Box>
          )}
        </Box>

        {facts && facts.length > 0 && (
          <Box
            component="dl"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: factColumns(facts.length, !!aside) },
              m: 0,
              borderTop: HAIRLINE,
            }}
          >
            {facts.map((fact, index) => (
              <Box
                key={fact.label}
                sx={{
                  ...GUTTER_SX,
                  py: 3,
                  // Two to a row on phones; an odd last fact takes the whole row,
                  // so no half-width line is left hanging.
                  gridColumn: {
                    xs: facts.length % 2 === 1 && index === facts.length - 1 ? '1 / -1' : 'auto',
                    md: 'auto',
                  },
                  borderTop: { xs: index > 1 ? HAIRLINE : 'none', md: 'none' },
                  borderLeft: {
                    xs: index % 2 === 1 ? HAIRLINE : 'none',
                    md: index > 0 ? HAIRLINE : 'none',
                  },
                }}
              >
                <Typography component="dt" sx={{ ...TYPE.caption, color: MUTED }}>
                  {fact.label}
                </Typography>
                <Typography component="dd" sx={{ ...TYPE.h3, m: 0, mt: 0.75, color: INK }}>
                  {fact.value}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

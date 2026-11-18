'use client';

import { cdn } from '@/utils/cdn';
import { useTranslate } from '@/locales';
import { CANVAS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';

import { HAIRLINE, PageSection, GRID_FRAME_SX, SectionHeader } from '@/components/_common/brand';

// ----------------------------------------------------------------------

type Moment = {
  src: string;
  /** The Meridian photos come in two widths (public/about); the CDN ones in one. */
  srcSet?: string;
  alt: string;
  /** Columns the cell takes: a single upright cell, or a double one for a landscape. */
  span: 1 | 2;
  /** Which part of the photo stays in frame when its cell crops it. */
  focus: string;
};

// A photo in public/about: `<name>.jpg`, and `<name>-<small>.jpg` for small cells.
const local = (name: string, small: number) => ({
  src: `/about/${name}.jpg`,
  srcSet: `/about/${name}-${small}.jpg ${small}w, /about/${name}.jpg 1200w`,
});

// A single cell is upright (3:4); a double is 3:2, which comes out exactly as
// tall, so every row is the same height.
const SHAPE = { 1: '3 / 4', 2: '3 / 2' } as const;

const SIZES = {
  1: '(min-width: 900px) min(300px, 25vw), 50vw',
  2: '(min-width: 900px) min(600px, 50vw), 100vw',
} as const;

const COLUMNS = { xs: 2, md: 4 };

// Three rows on wide screens, each two uprights and one landscape across two
// columns, the landscape right, left, right. Rossio and the Meridian wall are
// cropped close in their files, so the people read in a small cell. No
// captions.
const MOMENTS: Moment[] = [
  {
    ...local('meridian-duo', 600),
    alt: 'Two of the team in front of the Meridian 2026 Lisbon sponsor wall',
    span: 1,
    focus: '50% 50%',
  },
  {
    src: cdn('about-page/img2.webp'),
    alt: 'Three of the team under a neon Bitcoin sign',
    span: 1,
    focus: '50% 50%',
  },
  {
    src: cdn('about-page/t5.webp'),
    alt: 'Three of the team taking a selfie outside an airport',
    span: 2,
    focus: '50% 40%',
  },
  {
    ...local('beach', 700),
    alt: 'A group on a beach, tall sea rocks behind them',
    span: 2,
    focus: '50% 30%',
  },
  {
    ...local('reception', 600),
    alt: 'One of the team with a guest at an evening event, in warm yellow light',
    span: 1,
    focus: '50% 50%',
  },
  {
    src: cdn('about-page/t1.webp'),
    alt: 'Three of the team on a golf course',
    span: 1,
    focus: '50% 50%',
  },
  {
    src: cdn('about-page/img4.webp'),
    alt: 'Two of the team in front of a large painted mural',
    span: 1,
    focus: '50% 50%',
  },
  {
    ...local('rossio', 600),
    alt: 'Two of the team at night on a square paved in waves, a tall column behind them',
    span: 1,
    focus: '50% 50%',
  },
  {
    ...local('sunset', 700),
    alt: 'Three of the team in suits by the water at sunset',
    span: 2,
    focus: '50% 70%',
  },
];

/** Where each cell lands, filling rows of `columns` in the given order. */
function place(sequence: Moment[], columns: number) {
  const spots = new Map<Moment, { col: number; row: number }>();
  let col = 0;
  let row = 0;
  sequence.forEach((moment) => {
    if (col + moment.span > columns) {
      col = 0;
      row += 1;
    }
    spots.set(moment, { col, row });
    col += moment.span;
  });
  return spots;
}

const WIDE = place(MOMENTS, COLUMNS.md);

// Two to a row on phones and tablets: each wide row's two uprights side by
// side, then its landscape across, so the rows go pair, landscape, pair.
const NARROW_ORDER = [...MOMENTS].sort(
  (a, b) => WIDE.get(a)!.row - WIDE.get(b)!.row || a.span - b.span
);
const NARROW = place(NARROW_ORDER, COLUMNS.xs);

/**
 * Photos of the team as cells on the hairline grid, rows of one height. A cell
 * draws the line on its left unless it starts a row, and the line above it
 * unless it is in the first row.
 */
export function AboutMoments() {
  const { t } = useTranslate();

  return (
    <PageSection divider hatchFoot aria-labelledby="moments-title">
      <SectionHeader
        id="moments-title"
        eyebrow="Culture"
        title="Moments That Matter"
        subtitle={t(
          'From impromptu coffee runs to cross-team hackathons and Meridian conferences, these snapshots capture the energy, laughter, and collaboration that fuel our day-to-day.'
        )}
      />

      <Box
        component="ul"
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: `repeat(${COLUMNS.xs}, minmax(0, 1fr))`,
            md: `repeat(${COLUMNS.md}, minmax(0, 1fr))`,
          },
          ...GRID_FRAME_SX,
        }}
      >
        {MOMENTS.map((moment) => {
          const wide = WIDE.get(moment)!;
          const narrow = NARROW.get(moment)!;
          return (
            <Box
              component="li"
              key={moment.src}
              sx={{
                position: 'relative',
                minWidth: 0,
                order: { xs: NARROW_ORDER.indexOf(moment), md: 0 },
                gridColumn: `span ${moment.span}`,
                aspectRatio: SHAPE[moment.span],
                borderTop: {
                  xs: narrow.row > 0 ? HAIRLINE : 'none',
                  md: wide.row > 0 ? HAIRLINE : 'none',
                },
                borderLeft: {
                  xs: narrow.col > 0 ? HAIRLINE : 'none',
                  md: wide.col > 0 ? HAIRLINE : 'none',
                },
                bgcolor: CANVAS,
              }}
            >
              <Box
                component="img"
                src={moment.src}
                srcSet={moment.srcSet}
                sizes={moment.srcSet ? SIZES[moment.span] : undefined}
                alt={moment.alt}
                loading="lazy"
                decoding="async"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: moment.focus,
                }}
              />
            </Box>
          );
        })}
      </Box>
    </PageSection>
  );
}

import { HAIRLINE_COLOR } from './brand-colors';

// ----------------------------------------------------------------------

// The marketing site's grid. Plain values with no 'use client', so server
// components (the page, the layouts) can read them as well as client ones.
//
// The column is 1200px wide, or the screen less --frame-inset on either side
// when the screen is narrower. Two frame lines stand on its edges at every
// width (FrameLines), phones included, and everything but the hero photo lives
// between them: words, cells and tints.

/** From this width the column is its full 1200px, with 24px either side. */
export const FRAME_MIN = 1248;

export const FRAME_MQ = `@media (min-width: ${FRAME_MIN}px)`;

/**
 * How far in from the screen's edges the frame lines stand while the screen
 * is narrower than the column: 12px on phones, 24px from tablets up. The site
 * layout sets it; outside the site it is unset and reads as 0.
 */
export const FRAME_INSET_VARS = {
  '--frame-inset': '12px',
  '@media (min-width: 600px)': { '--frame-inset': '24px' },
} as const;

/** The column: the frame lines stand on its two edges. */
export const COLUMN_SX = {
  width: 'calc(100% - 2 * var(--frame-inset, 0px))',
  maxWidth: 'var(--page-max)',
  mx: 'auto',
} as const;

/**
 * The horizontal padding of words and controls inside the column, so nothing
 * touches a line: 16px on phones, 24px on tablets, 32px at full width.
 */
export const GUTTER_SX = { px: { xs: 2, sm: 3 }, [FRAME_MQ]: { px: 4 } } as const;

/**
 * A grid of cells across the column. It reaches out of the gutter to the frame
 * lines and lets them be its sides, at every width, so there is never a second
 * line beside them.
 */
export const GRID_FRAME_SX = {
  borderTop: `1px solid ${HAIRLINE_COLOR}`,
  borderBottom: `1px solid ${HAIRLINE_COLOR}`,
  mx: { xs: -2, sm: -3 },
  [FRAME_MQ]: { mx: -4 },
} as const;

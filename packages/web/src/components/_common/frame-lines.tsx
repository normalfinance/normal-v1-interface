import { HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

/** The layer the frame lines draw on: above every section's background. */
export const FRAME_LINES_Z = 1;

// Where a line stands: one pixel outside the column's edge (COLUMN_SX in
// theme/site-grid.ts), at every width.
const EDGE = 'calc((100% - min(var(--page-max), 100% - 2 * var(--frame-inset, 0px))) / 2 - 1px)';

// The line's colour, by what it is drawn over: the page, or a photo.
const COLORS = {
  light: HAIRLINE_COLOR,
  dark: 'rgba(255,255,255,0.1)',
  bright: 'rgba(255,255,255,0.4)',
} as const;

/**
 * The two vertical hairlines that frame the content column, the way
 * customer.io rules its pages, on phones as on desktops. Rendered inside any
 * `position: relative` band (the header, the page body, the footer, the hero
 * photo, the open mobile menu) so the lines run through all of them; each band
 * draws its own, so the sticky header never hides them.
 *
 * They sit on their own layer (FRAME_LINES_Z), above the sections: a section
 * paints its own background, and lines drawn underneath would vanish behind
 * it. A band meant to cover them (a full-width photo) sits one layer higher
 * and draws its own on top: `dark` over a dark photo (the home hero), `bright`
 * over a light one (About's group, on pale stone and carpet), where a faint
 * white would vanish.
 */
export function FrameLines({ tone = 'light' }: { tone?: keyof typeof COLORS }) {
  const color = COLORS[tone];

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: FRAME_LINES_Z,
        pointerEvents: 'none',
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '1px',
          bgcolor: color,
        },
        '&::before': { left: EDGE },
        '&::after': { right: EDGE },
      }}
    />
  );
}

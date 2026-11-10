import { COLUMN_SX, GRID_FRAME_SX } from '@/theme/site-grid';
import { HAIRLINE_COLOR, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

/**
 * Fine diagonal lines, 8px apart, in the strong hairline colour (a diagonal 1px
 * line reads lighter than a straight one, so this matches the grid's weight):
 * texture for an empty strip of the grid, never behind words or a photo. Drawn
 * with a repeating gradient, but hard-edged: 1px lines, no fade (listed in the
 * gradient test).
 */
export const HATCH_SX = {
  backgroundImage: `repeating-linear-gradient(135deg, ${HAIRLINE_STRONG} 0 1px, transparent 1px 8px)`,
} as const;

/**
 * The same hatch drawn in another colour: tone on tone inside a coloured zone
 * (the roadmap's chapters fill their empty cells this way), still hard-edged
 * 1px lines with no fade.
 */
export const hatchIn = (line: string) =>
  ({
    backgroundImage: `repeating-linear-gradient(135deg, ${line} 0 1px, transparent 1px 8px)`,
  }) as const;

/** The one height of every hatched strip on the site. */
export const HATCH_HEIGHT = { xs: 32, md: 48 } as const;

/**
 * A hatched strip across the column where a page changes chapter: after its
 * opening and before its close, unless the section there already ends in a
 * HatchFoot (never two strips in a row). It draws the line above it; the
 * section after it draws the one below.
 */
export function HatchRail() {
  return (
    <Box aria-hidden="true" sx={{ borderTop: `1px solid ${HAIRLINE_COLOR}` }}>
      <Box sx={{ ...COLUMN_SX, height: HATCH_HEIGHT, ...HATCH_SX }} />
    </Box>
  );
}

/**
 * The foot of a section that ends on a grid of cells (PageSection hatchFoot):
 * the strip between the grid's last line and the next section's first, where
 * there would otherwise be empty padding. It reaches the frame lines, like the
 * grid above it, and draws no lines of its own.
 */
export function HatchFoot() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        ...GRID_FRAME_SX,
        borderTop: 'none',
        borderBottom: 'none',
        height: HATCH_HEIGHT,
        ...HATCH_SX,
      }}
    />
  );
}

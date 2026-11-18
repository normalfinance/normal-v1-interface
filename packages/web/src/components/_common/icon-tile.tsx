import type { ReactNode } from 'react';

import { INK, PAPER, CANVAS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

const TONES = {
  ink: { bgcolor: INK, color: PAPER },
  soft: { bgcolor: CANVAS, color: INK },
  // The icon takes the colour around it: the wash's deep shade.
  wash: { bgcolor: PAPER, color: 'inherit' },
} as const;

/**
 * The one icon treatment: a line icon in a rounded square. `ink` (white icon on
 * ink) marks a feature; `soft` (ink icon on grey) sits in lists and menus;
 * `wash` sits on a brand wash, a page-coloured tile with the icon in the wash's
 * deep shade, like every word on it. On the plain page icons are never
 * coloured: colour belongs to the washes (DESIGN.md).
 */
export function IconTile({
  children,
  size = 44,
  tone = 'ink',
}: {
  children: ReactNode;
  size?: number;
  tone?: keyof typeof TONES;
}) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: 'var(--radius-md)',
        ...TONES[tone],
        '& svg': { fontSize: Math.round(size * 0.5) },
      }}
    >
      {children}
    </Box>
  );
}

'use client';

import type { ReactNode } from 'react';

import { TYPE } from '@/theme/type-scale';
import { INK, FIXED, HOVER, MUTED } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';

import { IconTile } from '@/components/_common/icon-tile';
import { HAIRLINE, GUTTER_SX, GRID_FRAME_SX } from '@/components/_common/brand';

// ----------------------------------------------------------------------

export type LinkCell = {
  icon: ReactNode;
  name: string;
  /** The line under the name: a handle, or what is behind the link. */
  detail: string;
  href: string;
  /** Leaves the site: opens in a new tab, marked with a corner arrow. */
  external?: boolean;
  /**
   * A network's own colours (SOCIAL_COLORS): the cell takes its wash, every
   * word its deep shade, and the icon is the network's mark on a white tile.
   * Without them the cell is plain, with a grey icon tile.
   */
  colors?: { tint: string; deep: string; mark: string };
};

/**
 * A network's mark in its own colour on a white square, the same in both
 * modes: X's black mark would vanish on the dark page (DESIGN.md: a mark on
 * the page sits on white).
 */
function MarkTile({ color, children }: { color: string; children: ReactNode }) {
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: 44,
        height: 44,
        borderRadius: 'var(--radius-md)',
        color,
        bgcolor: FIXED.white,
        '& svg': { fontSize: 22 },
      }}
    >
      {children}
    </Box>
  );
}

/**
 * A row of link cells across the column, reaching the frame lines: four on
 * desktop, two by two on tablets and phones. Each cell is one link; hover lays
 * a light wash over it, on white or on its own colour. Used by Contact (the
 * channels, each in its network's colours) and the 404 (where to go, plain).
 */
export function LinkCells({ items }: { items: LinkCell[] }) {
  return (
    <Box
      component="ul"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
        m: 0,
        p: 0,
        listStyle: 'none',
        ...GRID_FRAME_SX,
      }}
    >
      {items.map((item, index) => {
        const Arrow = item.external ? NorthEastRounded : ArrowForwardRounded;
        const { colors } = item;
        return (
          <Box
            component="li"
            key={item.name}
            sx={{
              display: 'flex',
              bgcolor: colors?.tint,
              borderTop: { xs: index > 1 ? HAIRLINE : 'none', md: 'none' },
              borderLeft: {
                xs: index % 2 === 1 ? HAIRLINE : 'none',
                md: index > 0 ? HAIRLINE : 'none',
              },
            }}
          >
            <ButtonBase
              href={item.href}
              {...(item.external && { target: '_blank', rel: 'noopener noreferrer' })}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                ...GUTTER_SX,
                py: { xs: 3, md: 4 },
                textAlign: 'left',
                color: colors ? colors.deep : INK,
                transition: 'background-color 200ms ease',
                // On a network's wash this reads as a slightly stronger wash.
                '&:hover': { bgcolor: HOVER },
                ...(!colors && { '&:hover .link-cell-arrow': { color: INK } }),
                '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: -2 },
              }}
            >
              <Box
                component="span"
                sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
              >
                {colors ? (
                  <MarkTile color={colors.mark}>{item.icon}</MarkTile>
                ) : (
                  <IconTile tone="soft">{item.icon}</IconTile>
                )}
                <Arrow
                  className="link-cell-arrow"
                  sx={{
                    fontSize: 20,
                    color: colors ? 'inherit' : MUTED,
                    transition: 'color 200ms ease',
                  }}
                />
              </Box>
              {/* A set distance below the icon, so the names line up across the row. */}
              <Box component="span" sx={{ ...TYPE.h4, display: 'block', pt: { xs: 4, md: 7 } }}>
                {item.name}
              </Box>
              <Box
                component="span"
                sx={{
                  ...TYPE.small,
                  display: 'block',
                  mt: 0.5,
                  color: colors ? 'inherit' : MUTED,
                  overflowWrap: 'anywhere',
                }}
              >
                {item.detail}
              </Box>
            </ButtonBase>
          </Box>
        );
      })}
    </Box>
  );
}

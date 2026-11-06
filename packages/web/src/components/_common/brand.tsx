'use client';

import type { ReactNode } from 'react';
import type { ButtonProps } from '@mui/material/Button';
import type { Theme, SxProps } from '@mui/material/styles';

import { forwardRef } from 'react';
import { TYPE } from '@/theme/type-scale';
import { GUTTER_SX, COLUMN_SX } from '@/theme/site-grid';
import {
  INK,
  BAND,
  FIXED,
  MUTED,
  PAPER,
  CANVAS,
  INK_SOFT,
  HAIRLINE_COLOR,
  HAIRLINE_STRONG,
  STATEMENT_COLORS,
} from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { HatchFoot } from './hatch';

// ----------------------------------------------------------------------

// The parts every page shares, so a page can't drift from the others.
// Rules: packages/web/DESIGN.md

export const MONO_FONT = '"Geist Mono", ui-monospace, monospace';

export const HAIRLINE = `1px solid ${HAIRLINE_COLOR}`;

// The marketing grid (theme/site-grid, so server components can read it too).
export { FRAME_MQ, FRAME_MIN, COLUMN_SX, GUTTER_SX, GRID_FRAME_SX } from '@/theme/site-grid';
export const HAIRLINE_ON_DARK = '1px solid rgba(255,255,255,0.08)';

/**
 * Words for screen readers only: in the page, not on it. The sizes are strings
 * on purpose: MUI reads a bare `width: 1` as 100%.
 */
export const VISUALLY_HIDDEN_SX = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  m: '-1px',
  p: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

/** A white block (dark in dark mode). Hover changes the border, never the depth. */
export const BLOCK_SX = {
  bgcolor: PAPER,
  border: HAIRLINE,
  borderRadius: 'var(--radius-lg)',
  p: { xs: '20px', md: '24px' },
} as const;

type Tone = 'light' | 'dark';

type WithSx = { sx?: SxProps<Theme> };

const sxArray = (sx?: SxProps<Theme>) => (Array.isArray(sx) ? sx : sx ? [sx] : []);

// ----------------------------------------------------------------------

type PageSectionProps = WithSx & {
  id?: string;
  /** light: white. muted: the grey canvas, to alternate with white. dark: ink. */
  tone?: Tone | 'muted';
  /** A hairline across the top, and full padding under it. */
  divider?: boolean;
  /**
   * For a section that ends on a grid of cells: the space under the grid's
   * last line is a hatched strip (HatchFoot), not empty padding.
   */
  hatchFoot?: boolean;
  children: ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

/**
 * One full-bleed band: the shared background, vertical rhythm and content
 * width. Light bands are white, muted bands the grey canvas and dark bands plain
 * ink, nothing behind any of them. Two light bands in a row share one gap.
 */
export function PageSection({
  tone = 'light',
  divider = false,
  hatchFoot = false,
  children,
  sx,
  ...other
}: PageSectionProps) {
  const dark = tone === 'dark';

  return (
    <Box
      component="section"
      data-tone={tone}
      sx={[
        {
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
          py: 'var(--section-y)',
          ...(hatchFoot && { pb: 0 }),
          color: dark ? FIXED.white : INK,
          bgcolor: dark ? BAND : tone === 'muted' ? CANVAS : PAPER,
          ...(divider && { borderTop: HAIRLINE }),
          '[data-tone="light"] + &[data-tone="light"]': { pt: divider ? 'var(--section-y)' : 0 },
        },
        ...sxArray(sx),
      ]}
      {...other}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          ...COLUMN_SX,
          ...GUTTER_SX,
        }}
      >
        {children}
        {hatchFoot && <HatchFoot />}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

type TextProps = WithSx & { tone?: Tone; children: ReactNode };

/** The small label above a heading. One style everywhere: grey, no dash, no dot. */
export function Eyebrow({ tone = 'light', children, sx }: TextProps) {
  return (
    <Typography
      variant="overline"
      component="p"
      sx={[
        {
          ...TYPE.eyebrow,
          display: 'block',
          color: tone === 'dark' ? 'rgba(255,255,255,0.55)' : MUTED,
        },
        ...sxArray(sx),
      ]}
    >
      {children}
    </Typography>
  );
}

/**
 * One of a statement's coloured phrases: the logo's colours in the logo's
 * order, light blue, purple, magenta, raspberry, orange, gold
 * (STATEMENT_COLORS). Display text on the page, never on a wash.
 */
export function StatementWord({ n, children }: { n: number; children: string }) {
  return (
    <Box component="span" sx={{ color: STATEMENT_COLORS[n] }}>
      {children}
    </Box>
  );
}

// ----------------------------------------------------------------------

type SectionHeaderProps = WithSx & {
  id?: string;
  tone?: Tone;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Sits opposite the heading on desktop: a button, a filter. */
  action?: ReactNode;
};

/** The heading of every section on every page. */
export function SectionHeader({
  id,
  tone = 'light',
  eyebrow,
  title,
  subtitle,
  action,
  sx,
}: SectionHeaderProps) {
  const dark = tone === 'dark';

  return (
    <Box
      sx={[
        {
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'flex-end' },
          justifyContent: 'space-between',
          gap: { xs: 3, md: 5 },
          mb: { xs: 5, md: 7 },
        },
        ...sxArray(sx),
      ]}
    >
      <Box sx={{ maxWidth: 760, minWidth: 0 }}>
        {eyebrow && (
          <Eyebrow tone={tone} sx={{ mb: 1 }}>
            {eyebrow}
          </Eyebrow>
        )}
        <Typography
          id={id}
          component="h2"
          sx={{
            ...TYPE.h2,
            color: dark ? FIXED.white : INK,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              ...TYPE.lead,
              mt: 2,
              maxWidth: 600,
              color: dark ? 'rgba(255,255,255,0.6)' : MUTED,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  );
}

// ----------------------------------------------------------------------

/** The title and one line of context at the top of every signed-in page. */
export function AppPageHeader({
  title,
  subtitle,
  action,
  sx,
}: WithSx & { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <Box
      sx={[
        {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        },
        ...sxArray(sx),
      ]}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 24, md: 28 },
            fontWeight: 500,
            lineHeight: 1.2,
            letterSpacing: '-0.025em',
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ mt: 0.5, fontSize: 15, lineHeight: 1.5, color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}

// ----------------------------------------------------------------------

type BrandButtonProps = Omit<ButtonProps, 'variant' | 'color' | 'size'> & {
  tone?: Tone;
  emphasis?: 'primary' | 'secondary';
  target?: string;
  rel?: string;
};

/**
 * The site's two button looks in token colours, for any MUI Button on the
 * marketing site: the theme's own contained button is a fixed dark grey, which
 * disappears on the dark page.
 */
export const INK_BUTTON_SX = {
  color: PAPER,
  bgcolor: INK,
  '&:hover': { bgcolor: INK_SOFT },
} as const;
export const OUTLINED_BUTTON_SX = {
  color: INK,
  bgcolor: PAPER,
  borderColor: HAIRLINE_STRONG,
  '&:hover': { bgcolor: CANVAS, borderColor: HAIRLINE_STRONG },
} as const;

const BUTTON_TONES = {
  // Light tone = on the page: token colours, so the buttons invert in dark mode.
  light: {
    primary: INK_BUTTON_SX,
    secondary: OUTLINED_BUTTON_SX,
  },
  // Dark tone = over a photo or an ink band: the same in both modes.
  dark: {
    primary: {
      bgcolor: FIXED.white,
      color: FIXED.ink,
      '&:hover': { bgcolor: 'rgba(255,255,255,0.88)' },
    },
    secondary: {
      color: FIXED.white,
      bgcolor: 'rgba(255,255,255,0.08)',
      borderColor: 'rgba(255,255,255,0.14)',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.24)' },
    },
  },
} as const;

type SegmentedControlProps<T extends string> = WithSx & {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: ReactNode; icon?: ReactNode }[];
};

/** Switches one view: price range, activity filter, settings tab. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  sx,
}: SegmentedControlProps<T>) {
  return (
    <Box
      sx={[
        {
          display: 'inline-flex',
          gap: '2px',
          p: '4px',
          width: 'fit-content',
          maxWidth: '100%',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          bgcolor: CANVAS,
          borderRadius: 'var(--radius-md)',
        },
        ...sxArray(sx),
      ]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              px: '12px',
              py: '6px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              borderRadius: 'var(--radius-sm)',
              transition: 'background 150ms, color 150ms',
              bgcolor: active ? PAPER : 'transparent',
              color: active ? INK : MUTED,
              '&:hover': { color: INK },
            }}
          >
            {option.icon}
            {option.label}
          </Box>
        );
      })}
    </Box>
  );
}

/** The page-level call to action. One height, one shape, four tones. */
export const BrandButton = forwardRef<HTMLButtonElement, BrandButtonProps>(function BrandButton(
  { tone = 'light', emphasis = 'primary', sx, ...other },
  ref
) {
  return (
    <Button
      ref={ref}
      size="large"
      variant={emphasis === 'primary' ? 'contained' : 'outlined'}
      sx={[
        {
          px: '20px',
          fontSize: 15,
          whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
          '& .MuiButton-icon > *:nth-of-type(1)': { fontSize: 16 },
        },
        BUTTON_TONES[tone][emphasis],
        ...sxArray(sx),
      ]}
      {...other}
    />
  );
});

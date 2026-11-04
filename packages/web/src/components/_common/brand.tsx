'use client';

import type { ReactNode } from 'react';
import type { ButtonProps } from '@mui/material/Button';
import type { Theme, SxProps } from '@mui/material/styles';

import { forwardRef } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

// The parts every page shares, so a page can't drift from the others.
// Rules: packages/web/DESIGN.md

export const BRAND_GRADIENT =
  'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)';

export const MONO_FONT = '"Geist Mono", ui-monospace, monospace';

export const HAIRLINE = '1px solid rgba(10,10,15,0.08)';
export const HAIRLINE_ON_DARK = '1px solid rgba(255,255,255,0.08)';

/** A white block. Hover changes the border, never the depth. */
export const BLOCK_SX = {
  bgcolor: '#FFFFFF',
  border: HAIRLINE,
  borderRadius: 'var(--radius-lg)',
  p: { xs: '20px', md: '24px' },
} as const;

/** The same block on a dark band. */
export const BLOCK_ON_DARK_SX = {
  bgcolor: 'rgba(255,255,255,0.04)',
  border: HAIRLINE_ON_DARK,
  borderRadius: 'var(--radius-lg)',
  p: { xs: '20px', md: '24px' },
} as const;

type Tone = 'light' | 'dark';

type WithSx = { sx?: SxProps<Theme> };

const sxArray = (sx?: SxProps<Theme>) => (Array.isArray(sx) ? sx : sx ? [sx] : []);

// ----------------------------------------------------------------------

/** The aurora and dot grid behind every dark band and panel. */
export function BandBackdrop({ dots = true }: { dots?: boolean }) {
  return (
    <>
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: '-10%',
          zIndex: 0,
          pointerEvents: 'none',
          background: [
            'radial-gradient(closest-side at 15% 30%, rgba(91,207,255,0.22), transparent 60%)',
            'radial-gradient(closest-side at 85% 70%, rgba(255,176,96,0.16), transparent 60%)',
            'radial-gradient(closest-side at 60% 15%, rgba(255,123,197,0.16), transparent 60%)',
            'radial-gradient(closest-side at 35% 85%, rgba(177,123,255,0.22), transparent 60%)',
          ].join(','),
          filter: 'blur(40px)',
          opacity: 0.85,
        }}
      />
      {dots && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
            maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
          }}
        />
      )}
    </>
  );
}

// ----------------------------------------------------------------------

type PageSectionProps = WithSx & {
  id?: string;
  tone?: Tone;
  children: ReactNode;
  'aria-labelledby'?: string;
};

/**
 * One full-bleed band: the shared background, vertical rhythm and content
 * width. Dark bands bring their backdrop. Two light bands in a row share one
 * gap instead of stacking two.
 */
export function PageSection({ tone = 'light', children, sx, ...other }: PageSectionProps) {
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
          color: dark ? '#FFFFFF' : 'text.primary',
          bgcolor: dark ? '#0A0A0F' : 'background.default',
          '[data-tone="light"] + &[data-tone="light"]': { pt: 0 },
        },
        ...sxArray(sx),
      ]}
      {...other}
    >
      {dark && <BandBackdrop />}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          mx: 'auto',
          maxWidth: 'var(--page-max)',
          px: { xs: 2, sm: 3 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

type TextProps = WithSx & { tone?: Tone; children: ReactNode };

/** The small label above a heading. One style everywhere, and no leading dash. */
export function Eyebrow({ tone = 'light', children, sx }: TextProps) {
  return (
    <Typography
      variant="overline"
      component="p"
      sx={[
        { display: 'block', color: tone === 'dark' ? 'rgba(255,255,255,0.55)' : 'text.secondary' },
        ...sxArray(sx),
      ]}
    >
      {children}
    </Typography>
  );
}

export function GradientText({ children, sx }: { children: ReactNode } & WithSx) {
  return (
    <Box
      component="span"
      sx={[
        {
          background: BRAND_GRADIENT,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        },
        ...sxArray(sx),
      ]}
    >
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
          <Eyebrow tone={tone} sx={{ mb: 1.5 }}>
            {eyebrow}
          </Eyebrow>
        )}
        <Typography
          id={id}
          component="h2"
          sx={{
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 500,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            color: dark ? '#FFFFFF' : 'text.primary',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              mt: 2,
              maxWidth: 520,
              fontSize: 16,
              lineHeight: 1.6,
              color: dark ? 'rgba(255,255,255,0.6)' : 'text.secondary',
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

/** The big type: a page's H1, and the closing band's heading. */
export function HeroTitle({
  tone = 'light',
  component = 'h1',
  id,
  children,
  sx,
}: TextProps & { component?: 'h1' | 'h2'; id?: string }) {
  return (
    <Typography
      id={id}
      component={component}
      sx={[
        {
          fontSize: 'clamp(40px, 5.6vw, 68px)',
          fontWeight: 500,
          lineHeight: 1.08,
          letterSpacing: '-0.035em',
          color: tone === 'dark' ? '#FFFFFF' : 'text.primary',
        },
        ...sxArray(sx),
      ]}
    >
      {children}
    </Typography>
  );
}

/** The paragraph under the H1. */
export function HeroLede({ tone = 'light', children, sx }: TextProps) {
  return (
    <Typography
      sx={[
        {
          mt: 3,
          maxWidth: 500,
          fontSize: 17,
          lineHeight: 1.6,
          color: tone === 'dark' ? 'rgba(255,255,255,0.6)' : 'text.secondary',
        },
        ...sxArray(sx),
      ]}
    >
      {children}
    </Typography>
  );
}

/** Label-over-value stat, as used in the hero meta rows. */
export function MetaItem({
  tone = 'light',
  label,
  value,
}: {
  tone?: Tone;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Eyebrow tone={tone} sx={{ mb: 0.75 }}>
        {label}
      </Eyebrow>
      <Box
        sx={{
          fontFamily: MONO_FONT,
          fontSize: 20,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: tone === 'dark' ? '#FFFFFF' : 'text.primary',
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

/** A small status dot. Live dots pulse with a crisp ring, never a glow. */
export function LiveDot({
  tone = 'light',
  pulse = false,
  color,
}: {
  tone?: Tone;
  pulse?: boolean;
  color?: string;
}) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 6,
        height: 6,
        flexShrink: 0,
        borderRadius: '50%',
        bgcolor: color ?? (tone === 'dark' ? '#4ADE80' : '#1AB37D'),
        ...(pulse && {
          boxShadow: '0 0 0 3px rgba(26,179,125,0.2)',
          animation: 'brand-live-pulse 2s ease-in-out infinite',
          '@keyframes brand-live-pulse': {
            '0%, 100%': { boxShadow: '0 0 0 3px rgba(26,179,125,0.18)' },
            '50%': { boxShadow: '0 0 0 5px rgba(26,179,125,0.08)' },
          },
        }),
      }}
    />
  );
}

/** The label above a hero title or a band heading. */
export function HeroBadge({ tone = 'light', children, sx }: TextProps) {
  const dark = tone === 'dark';

  return (
    <Box
      sx={[
        {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          height: 32,
          px: '12px',
          mb: 3,
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          borderRadius: 'var(--radius-md)',
          border: dark ? '1px solid rgba(255,255,255,0.12)' : HAIRLINE,
          bgcolor: dark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
          color: dark ? 'rgba(255,255,255,0.85)' : 'text.secondary',
        },
        ...sxArray(sx),
      ]}
    >
      {children}
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

const BUTTON_TONES = {
  light: {
    primary: {},
    secondary: { bgcolor: '#FFFFFF' },
  },
  dark: {
    primary: {
      bgcolor: '#FFFFFF',
      color: '#0A0A0F',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.88)' },
    },
    secondary: {
      color: '#FFFFFF',
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
          bgcolor: '#F4F4F7',
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
              bgcolor: active ? '#FFFFFF' : 'transparent',
              color: active ? '#0A0A0F' : '#6B6B76',
              '&:hover': { color: '#0A0A0F' },
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

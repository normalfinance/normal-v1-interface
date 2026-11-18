'use client';

import type { PointerEvent, KeyboardEvent } from 'react';
import type { AllocationPart, AllocationSlice } from '@/lib/portfolio/allocation';

import { useTranslate } from '@/locales';
import { useMemo, useState } from 'react';
import { INK, MUTED, HOVER } from '@/theme/brand-colors';
import { shareLabel, allocationColor, allocationSlices } from '@/lib/portfolio/allocation';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { VISUALLY_HIDDEN_SX } from './brand';
import { FIGURES, formatUsd } from './app-ui';

// ---------------------------------------------------------------------------
// What someone holds, as a ring (Niko 2026-11-10: "pie chart on home screen
// and assets to display our assets"). Each asset is an arc in its own colour,
// at its fixed place (lib/portfolio/allocation.ts), with a 2px gap of page
// between arcs and nothing drawn around them. Pointing at an arc, tapping it,
// or the arrow keys read it into the middle of the ring: its share first, then
// what it is. The ring's name says every share, for screen readers. The
// figures themselves stay readable without it, in the list beside or below.
// ---------------------------------------------------------------------------

const VIEW = 100;
/** The page's gap between arcs, in pixels at the ring's largest size. */
const GAP_PX = 2;

type Size = number | { xs: number; md: number };

const largest = (size: Size) => (typeof size === 'number' ? size : Math.max(size.xs, size.md));

/** A point on the ring: angles clockwise from the top. */
const at = (radius: number, angle: number) =>
  `${(VIEW / 2 + radius * Math.sin(angle)).toFixed(3)} ${(VIEW / 2 - radius * Math.cos(angle)).toFixed(3)}`;

function arcPath(radius: number, start: number, end: number) {
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${at(radius, start)} A ${radius} ${radius} 0 ${large} 1 ${at(radius, end)}`;
}

/** A whole ring, as one path (two half circles). */
const ringPath = (radius: number) =>
  `M ${at(radius, 0)} A ${radius} ${radius} 0 1 1 ${at(radius, Math.PI)} A ${radius} ${radius} 0 1 1 ${at(radius, 0)}`;

/** The ring's arcs, each shortened by half the gap at both ends; one asset is the whole ring. */
function arcsOf(slices: AllocationSlice[], radius: number, gapAngle: number) {
  if (slices.length === 1) return [{ slice: slices[0], d: ringPath(radius) }];
  return slices.flatMap((slice) => {
    const start = slice.start + gapAngle / 2;
    const end = slice.end - gapAngle / 2;
    // Too thin to draw past its gaps: still in the readout and the list.
    return end - start > 0.004 ? [{ slice, d: arcPath(radius, start, end) }] : [];
  });
}

export function AllocationDonut({
  parts,
  size,
  thickness,
  variant = 'full',
  loading = false,
  active: activeProp,
  onActiveChange,
  label,
}: {
  parts: AllocationPart[];
  /** Diameter in pixels, or one per breakpoint. */
  size: Size;
  /** The ring's width, in pixels at its largest size. */
  thickness: number;
  /** 'compact' reads an arc as its share and ticker (Home); 'full' adds its value. */
  variant?: 'compact' | 'full';
  loading?: boolean;
  /** The asset being read, when a legend beside the ring shares it. */
  active?: string | null;
  onActiveChange?: (symbol: string | null) => void;
  /** What the ring shows: "Your money by asset". */
  label: string;
}) {
  const { t } = useTranslate();
  const slices = useMemo(() => allocationSlices(parts), [parts]);
  const [ownActive, setOwnActive] = useState<string | null>(null);
  const active = activeProp !== undefined ? activeProp : ownActive;
  const setActive = (symbol: string | null) => {
    setOwnActive(symbol);
    onActiveChange?.(symbol);
  };

  const px = largest(size);
  const width = (thickness / px) * VIEW;
  const radius = VIEW / 2 - width / 2;
  const gapAngle = ((GAP_PX / px) * VIEW) / radius;
  const arcs = arcsOf(slices, radius, gapAngle);
  const reading = slices.find((s) => s.symbol === active) ?? null;
  const sx = { width: size, height: size, flexShrink: 0 } as const;

  if (loading) return <Skeleton variant="circular" sx={sx} />;
  if (!slices.length) return null;

  const step = (by: number) => {
    const i = reading ? slices.indexOf(reading) : by > 0 ? -1 : 0;
    setActive(slices[(i + by + slices.length) % slices.length].symbol);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const moves: Record<string, () => void> = {
      ArrowRight: () => step(1),
      ArrowDown: () => step(1),
      ArrowLeft: () => step(-1),
      ArrowUp: () => step(-1),
      Home: () => setActive(slices[0].symbol),
      End: () => setActive(slices[slices.length - 1].symbol),
      Escape: () => setActive(null),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  };
  // A mouse reads while it points; a finger's tap holds the reading until the
  // next tap (a second tap on the same arc lets go).
  const onArc = (event: PointerEvent<SVGPathElement>, symbol: string) => {
    if (event.type === 'pointerdown' && event.pointerType !== 'mouse') {
      setActive(active === symbol ? null : symbol);
    } else if (event.pointerType === 'mouse') {
      setActive(symbol);
    }
  };

  const described = slices.map((s) => `${s.label} ${shareLabel(s.share)}`).join(', ');

  return (
    <Box
      role="group"
      tabIndex={0}
      aria-label={`${label}: ${described}. ${t('Use the arrow keys to read each part.')}`}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setActive(null)}
      sx={{
        ...sx,
        position: 'relative',
        borderRadius: '50%',
        outline: 'none',
        '&:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
      }}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        width="100%"
        height="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {arcs.map(({ slice, d }) => {
          const dim = !!reading && reading.symbol !== slice.symbol;
          const common = {
            fill: 'none',
            stroke: allocationColor(slice.symbol),
            strokeWidth: width,
            style: { opacity: dim ? 0.3 : 1, transition: 'opacity 150ms' },
          };
          // The hit area is wider than the arc, so it is easy to land on.
          const hit = {
            fill: 'none',
            stroke: 'transparent',
            strokeWidth: width + 12,
            style: { cursor: 'pointer' },
            onPointerDown: (event: PointerEvent<SVGPathElement>) => onArc(event, slice.symbol),
            onPointerMove: (event: PointerEvent<SVGPathElement>) => onArc(event, slice.symbol),
          };
          return (
            <g key={slice.symbol}>
              <path d={d} {...common} />
              <path d={d} {...hit} />
            </g>
          );
        })}
      </svg>

      {/* The arc being read, in the middle: its share first, then what it is */}
      {reading && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography
            sx={{
              ...FIGURES,
              fontSize: variant === 'compact' ? { xs: 15, md: 18 } : { xs: 18, md: 22 },
              fontWeight: 500,
              lineHeight: 1.1,
              color: INK,
            }}
          >
            {shareLabel(reading.share)}
          </Typography>
          <Typography
            sx={{
              mt: 0.25,
              maxWidth: '70%',
              fontSize: variant === 'compact' ? { xs: 10.5, md: 11.5 } : 12,
              lineHeight: 1.25,
              color: MUTED,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {variant === 'compact' ? reading.symbol : reading.label}
          </Typography>
          {variant === 'full' && (
            <Typography sx={{ ...FIGURES, fontSize: 12, lineHeight: 1.25, color: MUTED }}>
              {formatUsd(reading.value)}
            </Typography>
          )}
        </Box>
      )}

      <Box aria-live="polite" sx={VISUALLY_HIDDEN_SX}>
        {reading
          ? `${reading.label}, ${shareLabel(reading.share)}, ${formatUsd(reading.value)}`
          : ''}
      </Box>
    </Box>
  );
}

/**
 * The ring's legend: each asset with its colour and share, in the ring's
 * order. Pointing at a row reads its arc, and the reading shows here too.
 */
export function AllocationLegend({
  parts,
  active,
  onActiveChange,
}: {
  parts: AllocationPart[];
  active: string | null;
  onActiveChange: (symbol: string | null) => void;
}) {
  const slices = useMemo(() => allocationSlices(parts), [parts]);
  if (!slices.length) return null;
  return (
    <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', minWidth: 0 }}>
      {slices.map((slice) => {
        const on = active === slice.symbol;
        return (
          <Box component="li" key={slice.symbol}>
            <ButtonBase
              onPointerEnter={(event) =>
                event.pointerType === 'mouse' && onActiveChange(slice.symbol)
              }
              onPointerLeave={(event) => event.pointerType === 'mouse' && onActiveChange(null)}
              onFocus={() => onActiveChange(slice.symbol)}
              onBlur={() => onActiveChange(null)}
              onClick={() => onActiveChange(on ? null : slice.symbol)}
              aria-label={`${slice.label}, ${shareLabel(slice.share)}, ${formatUsd(slice.value)}`}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                py: 0.625,
                px: 1,
                mx: -1,
                textAlign: 'left',
                bgcolor: on ? HOVER : 'transparent',
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 10,
                  height: 10,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: allocationColor(slice.symbol),
                }}
              />
              <Typography
                component="span"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13.5,
                  color: INK,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {slice.label}
              </Typography>
              <Typography component="span" sx={{ ...FIGURES, fontSize: 13.5, color: MUTED }}>
                {shareLabel(slice.share)}
              </Typography>
            </ButtonBase>
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * The ring with its legend beside it (Assets): pointing at an arc or a row
 * reads the same asset in both.
 */
export function AllocationPanel({
  parts,
  loading = false,
}: {
  parts: AllocationPart[];
  loading?: boolean;
}) {
  const { t } = useTranslate();
  const [active, setActive] = useState<string | null>(null);
  const held = useMemo(() => allocationSlices(parts).length > 0, [parts]);
  if (!loading && !held) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2.5, md: 3.5 } }}>
      <AllocationDonut
        parts={parts}
        size={{ xs: 120, md: 148 }}
        thickness={16}
        loading={loading}
        active={active}
        onActiveChange={setActive}
        label={t('Your money by asset')}
      />
      {/* Wide enough for every name whole ("Digital dollars"), however the ring's row is sized. */}
      <Box sx={{ flex: '1 1 auto', minWidth: { xs: 0, sm: 184 }, maxWidth: 260 }}>
        {loading ? (
          <Skeleton variant="rectangular" sx={{ height: 120 }} />
        ) : (
          <AllocationLegend parts={parts} active={active} onActiveChange={setActive} />
        )}
      </Box>
    </Box>
  );
}

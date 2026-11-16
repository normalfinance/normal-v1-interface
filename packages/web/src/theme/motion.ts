// ----------------------------------------------------------------------

// How things change on a page (DESIGN.md "Nothing moves"): what may change is
// colour, opacity and numbers, and every change eases on ONE curve, the same
// everywhere (Niko 2026-11-16: "all animations must animate with ease"). A
// change starts quickly and settles gently: an ease-out, never linear, never
// a bounce.

/** The one curve: quick out of the gate, a long soft landing (an ease-out). */
export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** How long a change takes, by how much of the screen it touches. */
export const MOTION_MS = {
  /** A hover, a pressed state, a border. */
  quick: 180,
  /** A menu, a dropdown, a tab's panel. */
  base: 300,
  /** A demo's step, a figure fading in. */
  slow: 600,
  /** A section arriving as it scrolls into view. */
  reveal: 800,
} as const;

export type MotionSpeed = keyof typeof MOTION_MS;

/**
 * A CSS transition on the curve: `ease('opacity')`, `ease(['background-color',
 * 'color'], 'quick')`, `ease('opacity', 'reveal', 120)` (a delay in ms).
 */
export function ease(
  properties: string | string[],
  speed: MotionSpeed | number = 'base',
  delayMs = 0
): string {
  const ms = typeof speed === 'number' ? speed : MOTION_MS[speed];
  const delay = delayMs ? ` ${delayMs}ms` : '';
  return (Array.isArray(properties) ? properties : [properties])
    .map((property) => `${property} ${ms}ms ${EASE}${delay}`)
    .join(', ');
}

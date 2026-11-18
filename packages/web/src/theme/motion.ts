// ----------------------------------------------------------------------

// How things change on a page (DESIGN.md "Nothing moves"): what may change is
// colour, opacity and numbers, and every change eases on ONE curve, the same
// everywhere (Niko 2026-11-16: "all animations must animate with ease"). A
// change starts quickly and settles gently: an ease-out, never linear, never
// a bounce.

/** The curve's control points: quick out of the gate, a long soft landing (an ease-out). */
const CURVE = [0.22, 1, 0.36, 1] as const;

/** The one curve, for CSS. */
export const EASE = `cubic-bezier(${CURVE.join(', ')})`;

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

/**
 * The same curve for motion drawn in script (a page scroll): how far along a
 * change is, 0 to 1, at a share of its time, 0 to 1. Solves the cubic Bézier
 * for its time with Newton's method, then halving if that stalls.
 */
export function easeAt(progress: number): number {
  const [x1, y1, x2, y2] = CURVE;
  const t = Math.min(1, Math.max(0, progress));
  const bezier = (a: number, b: number, s: number) =>
    3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
  const slope = (a: number, b: number, s: number) =>
    3 * (1 - s) * (1 - s) * a + 6 * (1 - s) * s * (b - a) + 3 * s * s * (1 - b);

  let s = t;
  for (let i = 0; i < 8; i += 1) {
    const error = bezier(x1, x2, s) - t;
    if (Math.abs(error) < 1e-6) return bezier(y1, y2, s);
    const d = slope(x1, x2, s);
    if (Math.abs(d) < 1e-6) break;
    s -= error / d;
  }
  let lo = 0;
  let hi = 1;
  s = t;
  for (let i = 0; i < 30; i += 1) {
    const x = bezier(x1, x2, s);
    if (Math.abs(x - t) < 1e-6) break;
    if (x < t) lo = s;
    else hi = s;
    s = (lo + hi) / 2;
  }
  return bezier(y1, y2, s);
}

export const GROUP_ACCENTS = [
  '#2DE9C8',
  '#00AFF7',
  '#947BFF',
  '#F8279C',
  '#FF6F4C',
  '#FFE13D',
] as const;

export type GroupAccent = (typeof GROUP_ACCENTS)[number];
export type HexColor = `#${string}`;

/** Cycles safely through GROUP_ACCENTS */
export const groupAccentByIndex = (i: number): GroupAccent =>
  GROUP_ACCENTS[((i % GROUP_ACCENTS.length) + GROUP_ACCENTS.length) % GROUP_ACCENTS.length];

/* -------------------------- tiny color helpers -------------------------- */

const clamp = (n: number, min = 0, max = 255) => Math.min(max, Math.max(min, n));

const hexToRgb = (hex: HexColor): [number, number, number] => {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbToHex = (r: number, g: number, b: number): HexColor =>
  `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}` as HexColor;

/**
 * Darken a hex by mixing with black.
 * @param amount 0..1 (0.18 = 18% darker)
 */
export const darkenHex = (hex: HexColor, amount = 0.18): HexColor => {
  const [r, g, b] = hexToRgb(hex);
  const f = 1 - clamp(amount, 0, 1);
  return rgbToHex(Math.round(r * f), Math.round(g * f), Math.round(b * f));
};

/* -------------------------- darker accent palette -------------------------- */

/** Slightly darker versions of GROUP_ACCENTS for better text contrast */
export const GROUP_ACCENTS_DARK = GROUP_ACCENTS.map((c) =>
  darkenHex(c, 0.18)
) as readonly HexColor[];

/** Cycle-safe accessor for the dark set */
export const groupAccentDarkByIndex = (i: number): HexColor =>
  GROUP_ACCENTS_DARK[
    ((i % GROUP_ACCENTS_DARK.length) + GROUP_ACCENTS_DARK.length) % GROUP_ACCENTS_DARK.length
  ];

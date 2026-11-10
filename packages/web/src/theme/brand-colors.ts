// ----------------------------------------------------------------------

// The colour system from packages/web/DESIGN.md, in two modes.
//
// The raw values live in PALETTE and HUE_PALETTE (light and dark). What the
// components import (INK, PAPER, BRAND_COLORS.sky.tint, ...) are CSS variables,
// so one component renders correctly in both modes without knowing which is on.
// SITE_THEME_CSS (theme/site-theme.ts) writes the variables from these same
// values: light on :root, dark under html[data-site-theme="dark"]. Only the
// marketing site turns dark mode on; the app keeps the light values for now.
//
// design-conformance.test.ts checks every text/background pair below, in both
// modes, so a new shade can't slip under its contrast floor.

export type Mode = 'light' | 'dark';

type Neutrals = {
  /** Text, primary buttons, ink fills. Light in dark mode. */
  ink: string;
  /** Strong body text, hover on ink fills. */
  inkSoft: string;
  /** Secondary text. */
  muted: string;
  /** Disabled and placeholder text only. */
  faint: string;
  /** The page, blocks, and text on ink fills. Dark in dark mode. */
  paper: string;
  /** Wells, icon tiles, soft fills; menus and dialogs in dark mode. */
  canvas: string;
  /** Every border and divider. */
  hairline: string;
  /** Inputs, outlined buttons. */
  hairlineStrong: string;
  /** A hover wash on a plain surface. */
  hover: string;
  /** An ink band inside a light page (old pages); a raised band in dark mode. */
  band: string;
  /** The footer: the site's one dark surface, plain ink. */
  footer: string;
};

export const PALETTE: Record<Mode, Neutrals> = {
  light: {
    ink: '#0A0A0F',
    inkSoft: '#2A2A33',
    muted: '#6B6B76',
    faint: '#9A9AA3',
    paper: '#FFFFFF',
    canvas: '#F4F4F7',
    hairline: 'rgba(10,10,15,0.08)',
    hairlineStrong: 'rgba(10,10,15,0.14)',
    hover: 'rgba(10,10,15,0.05)',
    band: '#0A0A0F',
    footer: '#0A0A0F',
  },
  dark: {
    ink: '#F3F2F7',
    inkSoft: '#D3D2DB',
    muted: '#A3A2AE',
    faint: '#6F6E7A',
    paper: '#0C0B11',
    canvas: '#17161E',
    hairline: 'rgba(255,255,255,0.09)',
    hairlineStrong: 'rgba(255,255,255,0.16)',
    hover: 'rgba(255,255,255,0.06)',
    band: '#15141B',
    // A shade darker than the dark page, under a hairline: the floor of the page.
    footer: '#08080B',
  },
};

export type BrandHue = 'sky' | 'mint' | 'violet' | 'coral' | 'magenta' | 'yellow';

type Tones = {
  /** A pale wash for cards and panels. */
  tint: string;
  /** Every word on the wash, and coloured words on the page (4.5:1 or better). */
  deep: string;
};

// The tones are customer.io's, sampled from their site: the Buffer and Monarch
// case-study cards (coral and sky tint and deep). The other four follow the
// rule those two cards obey: the wash is 10% of the colour on white, the deep
// shade the colour at 56% brightness. Dark mode lifts each tone so it reads on
// the dark page. `fill` is the logo colour, for dots and bars only.
export const HUE_PALETTE: Record<BrandHue, { fill: string } & Record<Mode, Tones>> = {
  violet: {
    fill: '#947BFF',
    light: { tint: '#F1ECF9', deep: '#3E236A' },
    dark: { tint: '#1C132D', deep: '#A88BD8' },
  },
  coral: {
    fill: '#FF6F4C',
    light: { tint: '#FDF0E9', deep: '#863D1C' },
    dark: { tint: '#301B16', deep: '#F3AA85' },
  },
  sky: {
    fill: '#00AFF7',
    light: { tint: '#E2F4FF', deep: '#123A88' },
    dark: { tint: '#0C1B33', deep: '#6BA7F0' },
  },
  magenta: {
    fill: '#F8279C',
    light: { tint: '#F8E9F1', deep: '#651440' },
    dark: { tint: '#270F21', deep: '#D37CAB' },
  },
  yellow: {
    fill: '#FFE13D',
    light: { tint: '#FCF6E7', deep: '#7E5E08' },
    dark: { tint: '#2E2411', deep: '#EDCA6E' },
  },
  // The logo's mint, in customer.io's green for words and washes.
  mint: {
    fill: '#2DE9C8',
    light: { tint: '#ECF6EE', deep: '#245B2D' },
    dark: { tint: '#14231B', deep: '#8DC797' },
  },
};

/**
 * The home statement's six coloured phrases, in order: the logo's gradient
 * read from light blue through purple, magenta and raspberry to orange and
 * gold. Both modes take the bright tones, as bright as the coloured blocks at
 * the foot of the page (Niko 2026-11-10: "the highlighted texts should match
 * the brightness of the cta blocks"); the blocks' own pastels are too faint as
 * words on white (1.2 to 2.1:1). The light gold is the bright gold 6% darker,
 * to keep the 2:1 floor. Display-size words on the page only (DESIGN.md):
 * 2.0 to 3.2:1 on white.
 */
export const STATEMENT_PALETTE: Record<Mode, readonly string[]> = {
  light: ['#41B6F8', '#A37EF4', '#CD69DC', '#ED6BA2', '#FD9156', '#E5AE38'],
  dark: ['#41B6F8', '#A37EF4', '#CD69DC', '#ED6BA2', '#FD9156', '#F4B93C'],
};

export type Social = 'x' | 'telegram' | 'discord' | 'linkedin';

/**
 * The four networks' own colours, for their cells on the Contact page only: a
 * wash and a deep shade in each network's colour family, in both modes, and
 * the colour of its mark, which is always drawn on a white tile (so X's black
 * mark shows on the dark page too).
 */
export const SOCIAL_PALETTE: Record<Social, { mark: string } & Record<Mode, Tones>> = {
  x: {
    mark: '#000000',
    light: { tint: '#EFF0F2', deep: '#14171A' },
    dark: { tint: '#1B1C21', deep: '#E7E9EA' },
  },
  telegram: {
    mark: '#229ED9',
    light: { tint: '#E3F5FD', deep: '#0B5A80' },
    dark: { tint: '#0B2432', deep: '#7FCBF0' },
  },
  discord: {
    mark: '#5865F2',
    light: { tint: '#ECEEFE', deep: '#2F379E' },
    dark: { tint: '#1A1C3E', deep: '#AAB0F9' },
  },
  linkedin: {
    mark: '#0A66C2',
    light: { tint: '#E6EEF9', deep: '#0A4A8C' },
    dark: { tint: '#0D1E35', deep: '#8DB7EA' },
  },
};

/** A whole block of colour: its surface and every word on it. */
type Block = { surface: string; words: string };

/** A colour mixed with white, `share` of the way: 0.5 is half and half. */
const mixWithWhite = (hex: string, share: number) =>
  `#${[1, 3, 5]
    .map((i) => {
      const value = parseInt(hex.slice(i, i + 2), 16);
      return Math.round(value + (255 - value) * share)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')
    .toUpperCase()}`;

/**
 * A block of colour as big as a slide (the closing carousel), made from the
 * hue's own colours, the same in both modes: the logo colour half and half
 * with white, bright and clean, every word in the hue's light-mode deep shade.
 * The deep shades read heavy as a whole block and the dark mode's tones dusty
 * on white; on the dark page these glow. Tested at 4.5:1.
 */
export const BLOCK_PALETTE = Object.fromEntries(
  (Object.keys(HUE_PALETTE) as BrandHue[]).map((hue) => {
    const { fill, light } = HUE_PALETTE[hue];
    const block = { surface: mixWithWhite(fill, 0.5), words: light.deep };
    return [hue, { light: block, dark: block }];
  })
) as Record<BrandHue, Record<Mode, Block>>;

// ----------------------------------------------------------------------

/** The CSS variable for a palette entry: `--nf-<name>`. */
export const cssVar = (name: string) => `var(--nf-${name})`;

export const INK = cssVar('ink');
export const INK_SOFT = cssVar('ink-soft');
export const MUTED = cssVar('muted');
export const FAINT = cssVar('faint');
export const PAPER = cssVar('paper');
/** The app's page behind the white blocks, and the soft fill of wells and tiles. */
export const CANVAS = cssVar('canvas');
/** The one hairline colour, for borders and dividers. */
export const HAIRLINE_COLOR = cssVar('hairline');
export const HAIRLINE_STRONG = cssVar('hairline-strong');
export const HOVER = cssVar('hover');
export const BAND = cssVar('band');
export const FOOTER_BG = cssVar('footer');
/** The statement's six phrase colours, in order (STATEMENT_PALETTE). */
export const STATEMENT_COLORS = STATEMENT_PALETTE.light.map((_, i) => cssVar(`statement-${i + 1}`));

/**
 * Status colours for words and marks (the app's reds, greens and ambers), in
 * both modes. The light values are the ones the app always used; the dark ones
 * lift the same hues so they read on the dark page.
 */
export type StatusTones = { danger: string; dangerDeep: string; success: string; warning: string };

export const STATUS_PALETTE: Record<Mode, StatusTones> = {
  light: { danger: '#B91C1C', dangerDeep: '#7F1D1D', success: '#0A6649', warning: '#8A4A00' },
  dark: { danger: '#F87171', dangerDeep: '#FCA5A5', success: '#5FD3A5', warning: '#F5B860' },
};

export const DANGER = cssVar('danger');
export const DANGER_DEEP = cssVar('danger-deep');
export const SUCCESS = cssVar('success');
export const WARNING = cssVar('warning');

/**
 * Ink and paper as rgb channels, for a wash of either at any strength that
 * follows the mode: `rgba(var(--nf-ink-rgb),0.04)`. The light ink is 10,10,15,
 * so the app's old `rgba(10,10,15,α)` washes read exactly as before in light
 * mode and turn into light washes on the dark page.
 */
export const INK_RGB = cssVar('ink-rgb');
export const PAPER_RGB = cssVar('paper-rgb');

/** A well a shade off the page (the app's old #FAFAFB): canvas mixed into paper. */
export const WELL = 'color-mix(in srgb, var(--nf-canvas) 40%, var(--nf-paper))';

/**
 * Colours that never change with the mode: words and buttons over a photo,
 * the drawings of the app, the logo. Everything else uses the tokens above.
 */
export const FIXED = {
  white: '#FFFFFF',
  ink: '#0A0A0F',
  /** The app as it looks today, for drawings of it (the hero phone). */
  app: PALETTE.light,
} as const;

export type HueShades = Tones & {
  /** The logo colour. Dots, bars and fills only; never text. */
  fill: string;
};

export const BRAND_COLORS = Object.fromEntries(
  (Object.keys(HUE_PALETTE) as BrandHue[]).map((hue) => [
    hue,
    {
      fill: HUE_PALETTE[hue].fill,
      tint: cssVar(`${hue}-tint`),
      deep: cssVar(`${hue}-deep`),
    },
  ])
) as Record<BrandHue, HueShades>;

/** A network's colours on the Contact page: its wash, deep shade and mark. */
export const SOCIAL_COLORS = Object.fromEntries(
  (Object.keys(SOCIAL_PALETTE) as Social[]).map((social) => [
    social,
    {
      mark: SOCIAL_PALETTE[social].mark,
      tint: cssVar(`social-${social}-tint`),
      deep: cssVar(`social-${social}-deep`),
    },
  ])
) as Record<Social, Tones & { mark: string }>;

/** A block of colour as tokens (BLOCK_PALETTE): its surface and its words. */
export const BLOCK_COLORS = Object.fromEntries(
  (Object.keys(BLOCK_PALETTE) as BrandHue[]).map((hue) => [
    hue,
    { surface: cssVar(`block-${hue}-surface`), words: cssVar(`block-${hue}-words`) },
  ])
) as Record<BrandHue, Block>;

/** Each colour's one job. Pick by role, never by hue, so the meaning stays fixed. */
export const COLOR_ROLES = {
  /** Wallet and cash (stablecoins), sending and receiving, links. */
  wallet: 'sky',
  /** Savings, growth, success. */
  savings: 'mint',
  /** Crypto and swap. */
  crypto: 'violet',
  /** Adding money and cashing out. */
  money: 'coral',
  /** Security prompts, the notification dot, "New". */
  attention: 'magenta',
  /** The hero badge, pending. */
  highlight: 'yellow',
} as const satisfies Record<string, BrandHue>;

export type ColorRole = keyof typeof COLOR_ROLES;

export const roleColor = (role: ColorRole): HueShades => BRAND_COLORS[COLOR_ROLES[role]];

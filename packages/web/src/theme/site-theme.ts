import {
  PALETTE,
  HUE_PALETTE,
  BLOCK_PALETTE,
  SOCIAL_PALETTE,
  STATUS_PALETTE,
  STATEMENT_PALETTE,
} from './brand-colors';

import type { Mode } from './brand-colors';

// ----------------------------------------------------------------------

// Dark mode for the whole site and app. Plain values, no 'use client': the root
// layout (a server component) writes both strings into the page head.
//
// One attribute drives it: html[data-site-theme="light" | "dark"]. The head
// script sets it before the first paint (no flash), from the visitor's choice
// in localStorage or, without one, their system setting. The site frame keeps
// it in step after that (layouts/site/use-site-theme.ts).
//
// Every route follows the one choice (Niko 2026-11-10: the app pages in dark
// and light mode too): the marketing site, the app, sign-in and the auth
// callbacks. The app reads its colours from the same tokens.

export const SITE_THEME_ATTR = 'data-site-theme';
export const SITE_THEME_STORAGE_KEY = 'nf-theme';

export type ThemeChoice = Mode | 'system';

// ----------------------------------------------------------------------

const toKebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** "#0A0A0F" -> "10 10 15", the form MUI's *Channel variables take. */
const channel = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');

function declarations(mode: Mode): string {
  const n = PALETTE[mode];
  const neutrals = Object.entries(n).map(([key, value]) => `--nf-${toKebab(key)}:${value};`);
  const hues = Object.entries(HUE_PALETTE).flatMap(([hue, tones]) =>
    Object.entries(tones[mode]).map(([tone, value]) => `--nf-${hue}-${tone}:${value};`)
  );
  const statement = STATEMENT_PALETTE[mode].map((value, i) => `--nf-statement-${i + 1}:${value};`);
  const socials = Object.entries(SOCIAL_PALETTE).flatMap(([social, tones]) =>
    Object.entries(tones[mode]).map(([tone, value]) => `--nf-social-${social}-${tone}:${value};`)
  );
  const blocks = Object.entries(BLOCK_PALETTE).flatMap(([hue, tones]) =>
    Object.entries(tones[mode]).map(([tone, value]) => `--nf-block-${hue}-${tone}:${value};`)
  );
  // Ink and paper as rgb channels (`rgba(var(--nf-ink-rgb),0.08)`), and the
  // status colours, for the app's washes, words and marks in both modes.
  const commas = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');
  const rgb = [`--nf-ink-rgb:${commas(n.ink)};`, `--nf-paper-rgb:${commas(n.paper)};`];
  const status = Object.entries(STATUS_PALETTE[mode]).map(
    ([key, value]) => `--nf-${toKebab(key)}:${value};`
  );
  return [...neutrals, ...hues, ...statement, ...socials, ...blocks, ...rgb, ...status].join('');
}

// In dark mode MUI's own colours follow too, so typography, menus, dialogs and
// anything rendered in a portal match the page.
function muiDarkOverrides(): string {
  const n = PALETTE.dark;
  const pairs: Record<string, string> = {
    'text-primary': n.ink,
    'text-primaryChannel': channel(n.ink),
    'text-secondary': n.muted,
    'text-secondaryChannel': channel(n.muted),
    'text-disabled': n.faint,
    'text-disabledChannel': channel(n.faint),
    'background-default': n.paper,
    'background-defaultChannel': channel(n.paper),
    'background-paper': n.canvas,
    'background-paperChannel': channel(n.canvas),
    'background-neutral': n.canvas,
    'background-neutralChannel': channel(n.canvas),
    divider: n.hairline,
    dividerChannel: '255 255 255',
    'action-hover': n.hover,
    'action-selected': 'rgba(255,255,255,0.10)',
    'action-focus': 'rgba(255,255,255,0.14)',
    'action-active': n.muted,
    'action-disabled': n.faint,
    'action-disabledBackground': 'rgba(255,255,255,0.10)',
  };
  return Object.entries(pairs)
    .map(([key, value]) => `--palette-${key}:${value};`)
    .join('');
}

const DARK = `html[${SITE_THEME_ATTR}="dark"]`;

/** Every token, both modes. Injected once in the root layout's head. */
export const SITE_THEME_CSS = [
  `:root{${declarations('light')}}`,
  `${DARK}{${declarations('dark')}${muiDarkOverrides()}color-scheme:dark;}`,
  `${DARK} body{background-color:var(--nf-paper);color:var(--nf-ink);}`,
  // Stellar's logo is a black rocket: white on the dark page, wherever it shows.
  // The invert turns the image's own fill white too, so never give this image a
  // background: put a disc on a wrapper around it (AssetAvatar's badge).
  `${DARK} img[src$="/tokens/XLM.webp"]{filter:invert(1);}`,
].join('');

/**
 * Runs in the head before anything paints. Mirrors resolveSiteTheme() in
 * layouts/site/use-site-theme.ts; keep the two in step.
 */
export const SITE_THEME_INIT = `(function(){try{var d=document.documentElement;var c=localStorage.getItem('${SITE_THEME_STORAGE_KEY}');var m=c==='dark'||c==='light'?c:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');d.setAttribute('${SITE_THEME_ATTR}',m);d.style.colorScheme=m;}catch(e){}})();`;

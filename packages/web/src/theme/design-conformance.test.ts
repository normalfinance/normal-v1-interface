import fs from 'fs';
import path from 'path';
import { it, expect, describe } from '@jest/globals';

import { shadows } from './core/shadows';
import { customShadows } from './core/custom-shadows';
import { APP_PATHS, SITE_THEME_CSS, SITE_THEME_ATTR } from './site-theme';
import {
  INK,
  BAND,
  FIXED,
  FAINT,
  HOVER,
  MUTED,
  PAPER,
  CANVAS,
  PALETTE,
  INK_SOFT,
  FOOTER_BG,
  HUE_PALETTE,
  BRAND_COLORS,
  SOCIAL_COLORS,
  SOCIAL_PALETTE,
  HAIRLINE_COLOR,
  HAIRLINE_STRONG,
  STATEMENT_COLORS,
  STATEMENT_PALETTE,
} from './brand-colors';

// ---------------------------------------------------------------------------
// The rules in packages/web/DESIGN.md, enforced on source text so a page can't
// drift back: a new block with a shadow, a gradient or a sliding panel fails CI
// on the PR that adds it. Exceptions below each carry their reason.
// ---------------------------------------------------------------------------

/** Files allowed a non-token radius, each with its reason. */
const RADIUS_EXCEPTIONS: Record<string, string> = {
  'components/_common/stat-card.tsx': 'ApexCharts bar option: a number of pixels, not CSS',
  'theme/create-theme.ts': 'MUI needs a number here; it equals --radius-md',
  'sections/home/hero-phone.tsx':
    'the screen of the phone in the hero photo: its corners are measured from the photo',
  'sections/home/cta-phones.tsx':
    "the closing carousel's phones: drawings of a device and its screens, with their corners",
};

/** Files allowed background blur, each with its reason. */
const BLUR_EXCEPTIONS: Record<string, string> = {
  'layouts/core/header-section.tsx': 'the template header; no page renders one (see layouts/)',
  'theme/core/mixins/background.ts': 'the bgBlur mixin itself; its callers are checked here',
};

/** Files allowed to write a gradient, each with its reason. */
const GRADIENT_EXCEPTIONS: Record<string, string> = {
  'components/_common/hatch.tsx':
    'the hatch: hard-edged 1px lines in the hairline colour, a texture with no fade',
  'sections/home/home-hero.tsx':
    'a scrim over the photo so the headline reads; a fade to nothing, not a drawn gradient',
  'theme/core/mixins/background.ts': 'template mixin definitions; their callers are checked here',
  'theme/core/mixins/border.ts': 'template mixin definitions; their callers are checked here',
  'theme/core/mixins/text.ts': 'template mixin definitions; their callers are checked here',
};

const SRC = path.join(__dirname, '..');
const SCANNED = ['app', 'sections', 'components', 'layouts', 'theme'];
// The vendored template kit. Its pages are not rendered, and what is rendered
// picks these rules up from the theme.
const SKIPPED = ['components/template/'];

function collectFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const FILES = SCANNED.flatMap((dir) => collectFiles(path.join(SRC, dir)))
  .map((file) => ({
    rel: path.relative(SRC, file).split(path.sep).join('/'),
    text: fs.readFileSync(file, 'utf8'),
  }))
  .filter(({ rel }) => !SKIPPED.some((prefix) => rel.startsWith(prefix)));

/** Every `pattern` match outside `exceptions`, as "file:line  matched text". */
function violations(
  pattern: RegExp,
  isAllowed: (match: RegExpMatchArray) => boolean,
  exceptions: Record<string, string> = {}
): string[] {
  return FILES.filter(({ rel }) => !exceptions[rel]).flatMap(({ rel, text }) =>
    [...text.matchAll(pattern)]
      .filter((match) => !isAllowed(match))
      .map((match) => {
        const line = text.slice(0, match.index).split('\n').length;
        return `${rel}:${line}  ${match[0].replace(/\s+/g, ' ').slice(0, 70)}`;
      })
  );
}

const quoted = (value: string) => value.match(/'[^']*'/g) ?? [];

/** WCAG 2.x contrast ratio between two #RRGGBB colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------

describe('design rules', () => {
  it('finds the source it is meant to scan', () => {
    expect(FILES.length).toBeGreaterThan(300);
    expect(FILES.some(({ rel }) => rel === 'sections/home/home-hero.tsx')).toBe(true);
  });

  it('every corner is a token or a true circle', () => {
    const allowed =
      /^'(var\(--radius-(xs|sm|md|lg|full|site)\)( !important)?|var\(--radius-lg\) var\(--radius-lg\) 0 0|0 0 var\(--radius-lg\) var\(--radius-lg\)|50%|inherit)'$/;
    const found = violations(
      /\bborderRadius\s*[:=]\s*([^,\n}]+)/g,
      (match) => {
        const value = match[1].trim();
        const strings = quoted(value);
        return strings.length > 0 ? strings.every((s) => allowed.test(s)) : value === '0';
      },
      RADIUS_EXCEPTIONS
    );
    expect(found).toEqual([]);
  });

  it('nothing has a shadow, not even a ring', () => {
    const allowed = /^'none( !important)?'$/;
    const found = violations(/\bboxShadow:\s*('[^']*'|`[^`]*`|[^,\n}]+)/g, (match) => {
      const strings = quoted(match[1]);
      return strings.length > 0 && strings.every((s) => allowed.test(s));
    });
    expect(found).toEqual([]);
  });

  it('the theme has no shadows to reach for', () => {
    expect(shadows.light.every((value) => value === 'none')).toBe(true);
    expect(Object.values(customShadows.light).every((value) => value === 'none')).toBe(true);
  });

  it('nothing is drawn with a gradient (the logo file is the only one)', () => {
    const found = violations(
      /(?:linear|radial|conic)-gradient\(|\btype:\s*'gradient'/g,
      () => false,
      GRADIENT_EXCEPTIONS
    );
    expect(found).toEqual([]);
  });

  it('nobody calls the template gradient mixins', () => {
    // The definition files only name them in their usage comments.
    const found = violations(
      /mixins\.(?:bgGradient|borderGradient|textGradient)\(/g,
      () => false,
      GRADIENT_EXCEPTIONS
    );
    expect(found).toEqual([]);
  });

  it('hover never lifts, scales or slides anything', () => {
    const found = violations(/'&:hover':\s*\{[^{}]*\btransform:[^{}]*\}/g, () => false);
    expect(found).toEqual([]);
  });

  it('nothing on a page moves', () => {
    const found = [
      // A keyframe animation may fade (a blinking caret), never move: written
      // as a style object or with MUI's keyframes template.
      ...violations(
        /'@keyframes [^']+':\s*\{(?:[^{}]|\{[^{}]*\})*\}|\bkeyframes`[^`]*`/g,
        (match) => !/\btransform\b|translate|scale(?:X|Y)?\(/.test(match[0])
      ),
      // Panels and indicators jump to their new place; they never slide there.
      ...violations(/\btransition:\s*['`][^'`]*\btransform\b/g, () => false),
      ...violations(/\.animate\(\s*\[/g, () => false),
      ...violations(/from 'framer-motion'/g, () => false),
    ];
    expect(found).toEqual([]);
  });

  it('nothing blurs the page behind it', () => {
    const found = violations(
      /\bbackdropFilter:\s*([^\n]*)|\bmixins\.bgBlur\(/g,
      (match) => (match[1] ?? '').includes("'none'"),
      BLUR_EXCEPTIONS
    );
    expect(found).toEqual([]);
  });

  it('eyebrows do not start with a dash', () => {
    const found = violations(/(?:\bt\('|eyebrow(?:=|: |="|=\{)['"]?|^\s*)— [A-Z]/gm, () => false);
    expect(found).toEqual([]);
  });

  it('pages use the one content width', () => {
    const found = violations(/\bmaxWidth:\s*'?(?:1200|1240|1400)\b/g, () => false);
    expect(found).toEqual([]);
  });
});

// The marketing site renders in both modes, so its colours come from the
// tokens (theme/brand-colors.ts), never a fixed light value: a '#0A0A0F' or an
// ink-alpha border would stay dark on the dark page. White and white alphas
// are allowed: the site uses them only on surfaces dark in both modes (the
// footer, photos, ink bands).
const SITE_SOURCES = [
  'app/(site)/',
  'layouts/site/',
  'sections/home/',
  'sections/about/',
  'sections/contact/',
  'sections/legal/',
  'sections/roadmap/',
  'sections/blocked/',
  'sections/error/',
  'components/_common/brand.tsx',
  'components/_common/backers.tsx',
  'components/_common/icon-tile.tsx',
  'components/_common/frame-lines.tsx',
  'components/_common/marketing-photo.tsx',
  'components/_common/page-hero.tsx',
];

/** Site files allowed a fixed colour, each with its reason. */
const SITE_COLOR_EXCEPTIONS: Record<string, string> = {
  'sections/home/home-hero.tsx': 'the scrim over the photo; the photo is the same in both modes',
};

describe('the marketing site follows dark mode', () => {
  it('takes every colour from the tokens', () => {
    const found = violations(
      /'#[0-9A-Fa-f]{3,8}\b[^']*'|rgba\(\s*(?:10|0)\s*,\s*(?:10|0)\s*,\s*(?:15|0)\s*,|'(?:grey|common)\.\w+'/g,
      () => false,
      SITE_COLOR_EXCEPTIONS
    ).filter((line) => SITE_SOURCES.some((prefix) => line.startsWith(prefix)));
    expect(found).toEqual([]);
  });

  it('the page CSS defines every token in both modes', () => {
    const [light, dark] = SITE_THEME_CSS.split(`html[${SITE_THEME_ATTR}="dark"]`);
    const tokens = [
      INK,
      INK_SOFT,
      MUTED,
      FAINT,
      PAPER,
      CANVAS,
      HAIRLINE_COLOR,
      HAIRLINE_STRONG,
      HOVER,
      BAND,
      FOOTER_BG,
      ...Object.values(BRAND_COLORS).flatMap((hue) => [hue.tint, hue.deep]),
      ...STATEMENT_COLORS,
      ...Object.values(SOCIAL_COLORS).flatMap((social) => [social.tint, social.deep]),
    ];
    tokens.forEach((token) => {
      const name = token.match(/--nf-[a-z0-9-]+/)?.[0];
      expect(name).toBeDefined();
      expect(light).toContain(`${name}:`);
      expect(dark).toContain(`${name}:`);
    });
  });

  it('MUI follows too, so menus, dialogs and typography match the dark page', () => {
    const dark = SITE_THEME_CSS.split(`html[${SITE_THEME_ATTR}="dark"]`)[1];
    ['text-primary', 'text-secondary', 'background-default', 'background-paper', 'divider'].forEach(
      (name) => expect(dark).toContain(`--palette-${name}:`)
    );
  });

  it('the app routes are left out, so the app stays light', () => {
    ['/app', '/app/savings', '/login', '/signup', '/auth/callback', '/dev'].forEach((route) =>
      expect(APP_PATHS.test(route)).toBe(true)
    );
    ['/', '/about', '/roadmap', '/contact', '/legal/tos', '/applications', '/developers'].forEach(
      (route) => expect(APP_PATHS.test(route)).toBe(false)
    );
  });
});

// ---------------------------------------------------------------------------

const MODES = ['light', 'dark'] as const;
const HUES = Object.entries(HUE_PALETTE);

describe.each(MODES)('%s mode stays readable (WCAG AA)', (mode) => {
  const page = PALETTE[mode];

  it('text on the page, on the canvas and on a primary button', () => {
    expect(contrast(page.ink, page.paper)).toBeGreaterThanOrEqual(7);
    expect(contrast(page.inkSoft, page.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(page.muted, page.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(page.muted, page.canvas)).toBeGreaterThanOrEqual(4.5);
    // A primary button is page-coloured words on an ink fill, also when hovered.
    expect(contrast(page.paper, page.ink)).toBeGreaterThanOrEqual(7);
    expect(contrast(page.paper, page.inkSoft)).toBeGreaterThanOrEqual(4.5);
  });

  it('light words on the footer and on an ink band', () => {
    expect(contrast(FIXED.white, page.footer)).toBeGreaterThanOrEqual(7);
    expect(contrast(FIXED.white, page.band)).toBeGreaterThanOrEqual(7);
  });

  it.each(HUES)('%s: the deep shade on the page and on its tint', (_, hue) => {
    expect(contrast(hue[mode].deep, page.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hue[mode].deep, hue[mode].tint)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(Object.entries(SOCIAL_PALETTE))(
    '%s: its deep shade on the page and on its wash',
    (_, social) => {
      expect(contrast(social[mode].deep, page.paper)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(social[mode].deep, social[mode].tint)).toBeGreaterThanOrEqual(4.5);
    }
  );

  it('the statement colours as display words on the page', () => {
    // The logo's gradient in customer.io's tones; the light gold is 2.2:1 on
    // white. So they are only ever display-size words on the page (the home
    // statement), never body text and never on a tint.
    expect(STATEMENT_PALETTE[mode]).toHaveLength(6);
    STATEMENT_PALETTE[mode].forEach((color) => {
      expect(contrast(color, page.paper)).toBeGreaterThanOrEqual(mode === 'light' ? 2 : 3);
    });
  });
});

describe('the logo colours', () => {
  it.each(HUES)('%s: dark ink reads on the fill', (_, hue) => {
    expect(contrast(FIXED.ink, hue.fill)).toBeGreaterThanOrEqual(4.5);
  });

  it('none is readable as text on white, so none is used as text', () => {
    HUES.forEach(([, hue]) => {
      expect(contrast(hue.fill, PALETTE.light.paper)).toBeLessThan(4.5);
    });
  });
});

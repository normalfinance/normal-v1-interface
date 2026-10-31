import fs from 'fs';
import path from 'path';
import { it, expect, describe } from '@jest/globals';

import { shadows } from './core/shadows';
import { customShadows } from './core/custom-shadows';

// ---------------------------------------------------------------------------
// The rules in packages/web/DESIGN.md, enforced on source text so a page can't
// drift back: a new block with a shadow or a 22px corner fails CI on the PR
// that adds it. Exceptions below each carry their reason.
// ---------------------------------------------------------------------------

/** Files allowed a non-token radius, each with its reason. */
const RADIUS_EXCEPTIONS: Record<string, string> = {
  'components/_common/stat-card.tsx': 'ApexCharts bar option: a number of pixels, not CSS',
  'components/_common/glow-border.tsx': 'radius is passed in by the caller',
  'theme/create-theme.ts': 'MUI needs a number here; it equals --radius-md',
};

/** Files allowed a soft shadow, each with its reason. */
const SHADOW_EXCEPTIONS: Record<string, string> = {
  'sections/landing-page/hero-portfolio-card.tsx':
    'the one shadow in the product: this block floats on the moving hero background',
};

/** Files allowed background blur, each with its reason. */
const BLUR_EXCEPTIONS: Record<string, string> = {
  'layouts/dashboard/normal-navbar.tsx': 'page content scrolls under the navbar',
  'layouts/core/header-section.tsx': 'a sticky header, for the same reason as the navbar',
  'theme/core/mixins/background.ts': 'the bgBlur mixin itself; its callers are checked here',
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

// ---------------------------------------------------------------------------

describe('design rules', () => {
  it('finds the source it is meant to scan', () => {
    expect(FILES.length).toBeGreaterThan(300);
    expect(FILES.some(({ rel }) => rel === 'sections/landing-page/hero-header/index.tsx')).toBe(
      true
    );
  });

  it('every corner is a token or a true circle', () => {
    const allowed =
      /^'(var\(--radius-(xs|sm|md|lg|full)\)( !important)?|var\(--radius-lg\) var\(--radius-lg\) 0 0|0 0 var\(--radius-lg\) var\(--radius-lg\)|50%|inherit)'$/;
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

  it('nothing has a soft shadow', () => {
    const allowed = /^'(none( !important)?|0 0 0 \d+(\.\d+)?px rgba\([^)]*\))'$/;
    const found = violations(
      /\bboxShadow:\s*('[^']*'|`[^`]*`|[^,\n}]+)/g,
      (match) => {
        const strings = quoted(match[1]);
        return strings.length > 0 && strings.every((s) => allowed.test(s));
      },
      SHADOW_EXCEPTIONS
    );
    expect(found).toEqual([]);
  });

  it('the theme has no shadows to reach for', () => {
    expect(shadows.light.every((value) => value === 'none')).toBe(true);
    expect(Object.values(customShadows.light).every((value) => value === 'none')).toBe(true);
  });

  it('the only shadow in the product is the hero block', () => {
    const hero = FILES.find(({ rel }) => rel === 'sections/landing-page/hero-portfolio-card.tsx');
    expect(hero?.text.match(/\bboxShadow:/g)).toHaveLength(1);
  });

  it('hover never lifts, scales or slides anything', () => {
    const found = violations(/'&:hover':\s*\{[^{}]*\btransform:[^{}]*\}/g, () => false);
    expect(found).toEqual([]);
  });

  it('nothing blurs the page behind it except the navbar', () => {
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

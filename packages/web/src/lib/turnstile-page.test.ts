import { it, expect, describe } from '@jest/globals';

import { normalizeSiteKey, buildTurnstilePage } from './turnstile-page';

describe('buildTurnstilePage', () => {
  it('embeds the site key and the postMessage contract', () => {
    const html = buildTurnstilePage({ siteKey: '0x4AAAAAAA' });
    expect(html).toContain('"0x4AAAAAAA"');
    expect(html).toContain("type: 'turnstile', token: token");
    expect(html).toContain("type: 'turnstile-error'");
    expect(html).toContain('challenges.cloudflare.com/turnstile/v0/api.js');
    expect(html).toContain('name="robots" content="noindex, nofollow"');
  });

  it('defaults theme/appearance and refuses values off the allowlist', () => {
    const html = buildTurnstilePage({ siteKey: 'k', theme: '"><script>', appearance: 'nope' });
    expect(html).toContain('theme: "light"');
    expect(html).toContain('appearance: "always"');
    expect(html).not.toContain('<script>"');
  });

  it('honours dark theme and interaction-only appearance', () => {
    const html = buildTurnstilePage({
      siteKey: 'k',
      theme: 'dark',
      appearance: 'interaction-only',
    });
    expect(html).toContain('theme: "dark"');
    expect(html).toContain('appearance: "interaction-only"');
    expect(html).toContain('background: #0A0A0F');
  });

  it('reports a missing site key instead of rendering nothing', () => {
    const html = buildTurnstilePage({ siteKey: '' });
    expect(html).toContain("reason: 'missing-site-key'");
  });

  it('strips quotes pasted around the env value — the live 2026-09-21 double-encoding', () => {
    const html = buildTurnstilePage({ siteKey: '"0x4AAAAAACUeRJhXGht9EqJI"' });
    expect(html).toContain('var siteKey = "0x4AAAAAACUeRJhXGht9EqJI";');
    expect(html).not.toContain('\\"0x4AAAAAACUeRJhXGht9EqJI\\"');
    expect(normalizeSiteKey(" '0xabc' ")).toBe('0xabc');
    expect(normalizeSiteKey(undefined)).toBe('');
  });

  it('surfaces a thrown render and any script error as turnstile-error messages', () => {
    const html = buildTurnstilePage({ siteKey: 'k' });
    expect(html).toContain("reason: 'render:'");
    expect(html).toContain("reason: 'script:'");
  });
});

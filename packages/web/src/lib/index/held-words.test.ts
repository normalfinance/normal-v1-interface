import { it, expect, describe } from '@jest/globals';

import { heldWords } from './held-words';

// The i18n stand-in: fills {{name}} the way the real t does.
const t = (key: string, opts?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts?.[name] ?? ''));

describe('heldWords: what a person reads about a coin that was not bought', () => {
  it('THE REPORT: the share was not there, so no "try again", and it says what was bought', () => {
    const words = heldWords(t, { coin: 'SOL', reason: 'missing', bought: ['BTC', 'ETH'] });
    expect(words.title).toBe('Solana was not bought');
    expect(words.body).toBe(
      'Bitcoin and Ethereum were bought. When its turn came, its share was no longer at your Base address, so trying again cannot buy it. Contact us and we will sort it out.'
    );
    expect(words.canRetry).toBe(false);
  });

  it('an exchange that kept failing: the share is safe on Base and trying again can work', () => {
    const words = heldWords(t, { coin: 'SOL', reason: 'route', bought: ['BTC', 'ETH'] });
    expect(words.title).toBe('Solana was not bought yet');
    expect(words.body).toContain('Bitcoin and Ethereum were bought.');
    expect(words.body).toContain('its share is safe as digital dollars at your own Base address');
    expect(words.canRetry).toBe(true);
  });

  it('never reads as the whole purchase failing', () => {
    for (const reason of ['missing', 'route'] as const) {
      const words = heldWords(t, { coin: 'SOL', reason, bought: ['BTC'] });
      expect(words.title).not.toMatch(/did not go through/i);
      expect(words.body.startsWith('Bitcoin was bought.')).toBe(true);
    }
  });

  it('with nothing bought yet, it does not claim anything was', () => {
    const words = heldWords(t, { coin: 'BTC', reason: 'route', bought: [] });
    expect(words.body.startsWith('The exchange for Bitcoin kept failing')).toBe(true);
  });
});

// #32 chunk 3 — the resumability contract of the guided setup: the current
// step is DERIVED from state, so every re-open lands on the first unmet
// condition. Each case below is a "user killed the tab here" scenario.

import { deriveSetupStep } from './normal-wallet-setup';

const probe = (over: Partial<Parameters<typeof deriveSetupStep>[1] & object> = {}) => ({
  exists: true,
  hasUsdcTrustline: true,
  xlmBalance: 4,
  usdcBalance: 50,
  ...over,
});

describe('deriveSetupStep (#32 guided setup resumability)', () => {
  it('no wallet yet → create', () => {
    expect(deriveSetupStep(null, null, 20)).toBe('create');
  });

  it('wallet created but never funded (killed tab after passkey) → activate', () => {
    expect(
      deriveSetupStep(
        'GNEW',
        { ...probe(), exists: false, hasUsdcTrustline: false, xlmBalance: 0, usdcBalance: 0 },
        20
      )
    ).toBe('activate');
    // probe unavailable counts as not-activated, never as done
    expect(deriveSetupStep('GNEW', null, 20)).toBe('activate');
  });

  it('activated but no trustline → trustline', () => {
    expect(deriveSetupStep('GNEW', probe({ hasUsdcTrustline: false, usdcBalance: 0 }), 20)).toBe(
      'trustline'
    );
  });

  it('trustline set but not enough USDC for the typed swap → fund', () => {
    expect(deriveSetupStep('GNEW', probe({ usdcBalance: 5 }), 20)).toBe('fund');
  });

  it('enough USDC for the typed amount → ready (repeat swaps skip everything)', () => {
    expect(deriveSetupStep('GNEW', probe({ usdcBalance: 20 }), 20)).toBe('ready');
    expect(deriveSetupStep('GNEW', probe(), 20)).toBe('ready');
  });

  it('no amount typed yet: empty wallet still asks to fund, funded wallet is ready', () => {
    expect(deriveSetupStep('GNEW', probe({ usdcBalance: 0 }), 0)).toBe('fund');
    expect(deriveSetupStep('GNEW', probe({ usdcBalance: 3 }), 0)).toBe('ready');
  });
});

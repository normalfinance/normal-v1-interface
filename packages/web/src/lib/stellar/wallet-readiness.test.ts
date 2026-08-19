import { it, expect, describe } from '@jest/globals';

import { deriveWalletReadiness } from './wallet-readiness';

// Pins the #74 notice contract. The dangerous regressions all look the same:
// a probe that is loading or FAILED being shown as a confident "not
// activated" / "no trustline" warning (failure ≠ empty, register 2026-08-17).

const base = { isLoading: false, error: null, accountExists: true, hasUsdcTrustline: true };

describe('deriveWalletReadiness', () => {
  it('ready wallet → ready (renders nothing)', () => {
    expect(deriveWalletReadiness(base)).toBe('ready');
  });

  it('loading outranks everything — booleans are reset lies during a probe', () => {
    expect(
      deriveWalletReadiness({
        isLoading: true,
        error: null,
        accountExists: false,
        hasUsdcTrustline: false,
      })
    ).toBe('checking');
  });

  it('a FAILED probe is unknown, never "not activated"', () => {
    expect(
      deriveWalletReadiness({
        isLoading: false,
        error: new Error('horizon 503'),
        accountExists: false,
        hasUsdcTrustline: false,
      })
    ).toBe('unknown');
  });

  it('genuine 404 → not-activated (activation outranks the trustline)', () => {
    expect(deriveWalletReadiness({ ...base, accountExists: false, hasUsdcTrustline: false })).toBe(
      'not-activated'
    );
  });

  it('active without trustline → no-trustline', () => {
    expect(deriveWalletReadiness({ ...base, hasUsdcTrustline: false })).toBe('no-trustline');
  });
});

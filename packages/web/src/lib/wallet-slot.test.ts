// #32 chunk 1 — the wallet-slot invariants from doc 72. Each test name
// carries its invariant id; these are the contracts that keep dual-wallet
// support from breaking login, signup, or silently switching wallets (#42).

import { shouldAdoptIntoSlot, shouldRestoreTurnkeyStellar } from './wallet-slot';

describe('shouldRestoreTurnkeyStellar (self-heal guard)', () => {
  it('I6: fresh device — no slot, no breadcrumb → restore (new-device login keeps working)', () => {
    expect(shouldRestoreTurnkeyStellar(undefined, undefined)).toBe(true);
  });

  it('wiped slot of a normal-wallet user → restore (the original self-heal case)', () => {
    expect(shouldRestoreTurnkeyStellar(undefined, 'normal-wallet')).toBe(true);
  });

  it('I2/I7: user last chose an external wallet and disconnected → NEVER restore (#42)', () => {
    for (const external of [
      'freighter',
      'lobstr',
      'wallet-connect',
      'ledger',
      'stellar-wallets-kit',
    ]) {
      expect(shouldRestoreTurnkeyStellar(undefined, external)).toBe(false);
    }
  });

  it('occupied slot → never restore, regardless of breadcrumb', () => {
    expect(shouldRestoreTurnkeyStellar('GABC', undefined)).toBe(false);
    expect(shouldRestoreTurnkeyStellar('GABC', 'normal-wallet')).toBe(false);
    expect(shouldRestoreTurnkeyStellar('GABC', 'lobstr')).toBe(false);
  });
});

describe('shouldAdoptIntoSlot (creation no-steal guard)', () => {
  it('I5: signup/onboarding — empty slot → adopt (wallet creation connects as today)', () => {
    expect(shouldAdoptIntoSlot(undefined)).toBe(true);
    expect(shouldAdoptIntoSlot('')).toBe(true);
  });

  it('I1: external wallet connected → creating a companion never steals the slot', () => {
    expect(shouldAdoptIntoSlot('GEXTERNALWALLET')).toBe(false);
  });
});

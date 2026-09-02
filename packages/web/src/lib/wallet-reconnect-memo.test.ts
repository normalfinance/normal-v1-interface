/**
 * @jest-environment jsdom
 */
// Safety rules of the external-wallet memo (doc: register 2026-08-22).
// The memo is only a HINT; ownership is proven server-side before any
// re-attach. These tests pin the two rules that must never regress.

import {
  forgetExternalWallet,
  readExternalWalletMemo,
  rememberExternalWallet,
} from './wallet-reconnect-memo';

describe('wallet-reconnect-memo', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips an external wallet', () => {
    rememberExternalWallet('GABC', 'lobstr');
    expect(readExternalWalletMemo()).toEqual({ address: 'GABC', walletType: 'lobstr' });
  });

  it('NEVER remembers the Normal wallet (it restores from the server, not a browser hint)', () => {
    rememberExternalWallet('GNORMAL', 'normal-wallet');
    expect(readExternalWalletMemo()).toBeNull();
  });

  it('ignores incomplete input rather than storing a half-memo', () => {
    rememberExternalWallet('', 'lobstr');
    rememberExternalWallet('GABC', null);
    rememberExternalWallet(undefined, 'lobstr');
    expect(readExternalWalletMemo()).toBeNull();
  });

  it('forget clears it — an explicit disconnect must not come back on next login', () => {
    rememberExternalWallet('GABC', 'lobstr');
    forgetExternalWallet();
    expect(readExternalWalletMemo()).toBeNull();
  });

  it('returns null on a corrupted entry instead of throwing', () => {
    localStorage.setItem('nf:last-external-wallet:v1', '{not json');
    expect(readExternalWalletMemo()).toBeNull();
    localStorage.setItem('nf:last-external-wallet:v1', '{"address":"GABC"}');
    expect(readExternalWalletMemo()).toBeNull();
  });
});

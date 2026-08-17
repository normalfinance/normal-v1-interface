// #32 4e — the empty-destination scenario (send XLM/USDC from the Normal
// wallet to a brand-new Lobstr wallet). Every case here used to fail
// ON-CHAIN with a raw result code after the user had signed.

import { planStellarSend } from './send-plan';

describe('planStellarSend (empty/foreign destination handling)', () => {
  it('XLM to a fresh (non-existing) account → createAccount, not payment', () => {
    expect(
      planStellarSend({
        symbol: 'XLM',
        amount: 4,
        destinationExists: false,
        destinationHasTrustline: null,
      })
    ).toEqual({ kind: 'create-account' });
  });

  it('XLM below the 1 XLM activation minimum → blocked with the reason', () => {
    expect(
      planStellarSend({
        symbol: 'XLM',
        amount: 0.5,
        destinationExists: false,
        destinationHasTrustline: null,
      })
    ).toEqual({ kind: 'blocked', reason: 'activation-minimum' });
  });

  it('USDC to a non-existing account → blocked (activate with XLM first)', () => {
    expect(
      planStellarSend({
        symbol: 'USDC',
        amount: 10,
        destinationExists: false,
        destinationHasTrustline: null,
      })
    ).toEqual({ kind: 'blocked', reason: 'destination-not-active' });
  });

  it('USDC to an active account WITHOUT the trustline → blocked (add it there)', () => {
    expect(
      planStellarSend({
        symbol: 'USDC',
        amount: 10,
        destinationExists: true,
        destinationHasTrustline: false,
      })
    ).toEqual({ kind: 'blocked', reason: 'destination-needs-trustline' });
  });

  it('the happy paths stay plain payments', () => {
    expect(
      planStellarSend({
        symbol: 'XLM',
        amount: 2,
        destinationExists: true,
        destinationHasTrustline: null,
      })
    ).toEqual({ kind: 'payment' });
    expect(
      planStellarSend({
        symbol: 'USDC',
        amount: 10,
        destinationExists: true,
        destinationHasTrustline: true,
      })
    ).toEqual({ kind: 'payment' });
  });

  it('unknown trustline state is NOT a block — the chain stays the judge', () => {
    expect(
      planStellarSend({
        symbol: 'USDC',
        amount: 10,
        destinationExists: true,
        destinationHasTrustline: null,
      })
    ).toEqual({ kind: 'payment' });
  });
});

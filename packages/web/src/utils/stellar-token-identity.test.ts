// The wallet-setup dialog's "Move the USDC you want to swap" step looks USDC
// up BY CONTRACT. Aggregate-derived tokens carried the literal string "USDC"
// there, so the lookup failed forever while the UI said "try again in a
// moment" (live 2026-08-22). These pin the identity the selectors need.

import type { Token, NetworkConfig } from '@normalfinance/types';

import { withStellarTokenIdentity } from './stellar-token-identity';

const config = {
  USDC_ADDRESS: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
  USDC_ISSUER: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  XLM_ADDRESS: '',
} as unknown as NetworkConfig;

// Exactly what portfolioAssetToToken produces: contract falls back to symbol.
const asAggregate = (symbol: string, balance: string): Token =>
  ({ symbol, contract: symbol, balance, decimals: 7, issuer: '' }) as Token;

// The selector the dialog uses, inlined: importing token-selectors pulls the
// untransformed ESM constants bundle into jest for no extra coverage.
const findByContract = (tokens: Token[], contract: string) =>
  tokens.find((t) => t.contract === contract);

describe('withStellarTokenIdentity', () => {
  it('makes USDC findable by the contract the selector matches on', () => {
    const tokens = [withStellarTokenIdentity(asAggregate('USDC', '39.44'), config)];
    // Before the fix this was undefined and the dialog dead-ended.
    expect(findByContract(tokens, config.USDC_ADDRESS)?.balance).toBe('39.44');
  });

  it('carries the configured issuer, which send/trustline flows need', () => {
    expect(withStellarTokenIdentity(asAggregate('USDC', '1'), config).issuer).toBe(
      config.USDC_ISSUER
    );
  });

  it('leaves XLM alone when no contract is configured (it matches by symbol)', () => {
    expect(withStellarTokenIdentity(asAggregate('XLM', '3'), config).contract).toBe('XLM');
  });

  it('does not invent an issuer for other assets', () => {
    expect(withStellarTokenIdentity(asAggregate('BTC', '0.1'), config).issuer).toBe('');
  });
});

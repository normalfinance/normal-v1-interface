import type { Token, NetworkConfig } from '@normalfinance/types';

/** Give an aggregate-derived token the identity the selectors match on.
 *
 *  The aggregate is display-oriented: portfolioAssetToToken has no entry for
 *  XLM/USDC in NATIVE_DISPLAY, so it falls back to `contract: symbol` and the
 *  token ends up carrying the literal string "USDC". getSwapUsdcToken matches
 *  by CONTRACT against config.USDC_ADDRESS (a C… Soroban address), so it
 *  never matched — the wallet-setup dialog's "Move the USDC you want to swap"
 *  step could not find USDC no matter how long you waited, and said "not
 *  loaded yet — try again in a moment" forever (live 2026-08-22).
 *
 *  Patched HERE rather than by loosening the selector to match on symbol:
 *  these assets are our own portfolio and trustworthy, whereas the selectors
 *  are also handed open token lists where a look-alike "USDC" must not win.
 */
export function withStellarTokenIdentity(tk: Token, config: NetworkConfig): Token {
  if (tk.symbol === 'USDC')
    return { ...tk, issuer: config.USDC_ISSUER, contract: config.USDC_ADDRESS || tk.contract };
  if (tk.symbol === 'XLM')
    return { ...tk, issuer: '', contract: config.XLM_ADDRESS || tk.contract };
  return { ...tk, issuer: '' };
}

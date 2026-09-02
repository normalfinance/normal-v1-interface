'use client';

import type { Token } from '@normalfinance/types';

import { useMemo } from 'react';
import { useStellarConfig } from '@/hooks';
import { portfolioAssetToToken } from '@/lib/portfolio/display';
import { withStellarTokenIdentity } from '@/utils/stellar-token-identity';

import { useWalletBalances } from './use-wallet-balances';

// ---------------------------------------------------------------------------
// Doc 75 Phase 2c — the drop-in replacement for the retired persist token
// store. Same Token[] shape the store held (the SLOT wallet's XLM/USDC), but
// sourced from the portfolio aggregate: always fresh (activity-event
// refreshed, localStorage-seeded), one source with every other surface.
// Issuer is patched from config because the aggregate mapper is
// display-oriented — send/trustline flows build real assets from it.
// ---------------------------------------------------------------------------

export function useStellarTokens(enabled = true): Token[] {
  const { assets } = useWalletBalances(enabled);
  const config = useStellarConfig();
  return useMemo(
    () =>
      assets
        .filter((a) => a.chain === 'stellar')
        .map((a) => withStellarTokenIdentity(portfolioAssetToToken(a), config)),
    [assets, config]
  );
}

export { withStellarTokenIdentity };

import type { Token } from '@normalfinance/types';
import type { PortfolioAsset } from '@/types/portfolio';

import { cdn } from '@normalfinance/utils';

// ---------------------------------------------------------------------------
// P0-1 (#66): maps a server-aggregated PortfolioAsset onto the Token shape
// the swap-card / send-modal hooks have always returned. Pure — pinned by
// native-token.test.ts — so the selector hooks stay logic-free.
// ---------------------------------------------------------------------------

export type NativeChain = 'bitcoin' | 'ethereum' | 'solana';

const SPECS: Record<NativeChain, { symbol: string; name: string; contract: string; icon: string }> =
  {
    bitcoin: {
      symbol: 'BTC',
      name: 'Bitcoin',
      contract: '__btc__',
      icon: cdn('tokens/bitcoin.webp'),
    },
    ethereum: {
      symbol: 'ETH',
      name: 'Ethereum',
      contract: '__eth__',
      icon: cdn('tokens/ethereum.webp'),
    },
    solana: { symbol: 'SOL', name: 'Solana', contract: '__sol__', icon: cdn('tokens/solana.webp') },
  };

/**
 * Null when the aggregate has no row for the chain (no address provisioned
 * or first load still in flight) — matching the old hooks' "absent card is
 * honest where a zero is a lie" behavior.
 */
export function nativeAssetToToken(
  asset: PortfolioAsset | undefined,
  chain: NativeChain
): Token | null {
  if (!asset) return null;
  const spec = SPECS[chain];
  return {
    symbol: spec.symbol,
    contract: spec.contract,
    name: spec.name,
    issuer: '',
    org: '',
    domain: '',
    icon: spec.icon,
    decimals: asset.decimals,
    featured: false,
    balance: asset.balance ?? '0',
    price: asset.price ?? '0',
    percentageChange: asset.change24h ?? 0,
  } as Token;
}

import type { IndexDef, IndexWeight } from '@/lib/index/basket';

import { useMemo } from 'react';
import { marketWeights } from '@/lib/index/basket';

import { useMarkets } from './use-markets';

// ---------------------------------------------------------------------------
// An index's shares by market size, from the same cached market data every
// index screen reads (and the purchase is split by: server/markets.ts). Null
// until the market sizes are known: a share is never guessed.
// ---------------------------------------------------------------------------

export function useIndexWeights(def: IndexDef): {
  weights: IndexWeight[] | null;
  markets: ReturnType<typeof useMarkets>['markets'];
  loading: boolean;
  /** The market data could not be read (after its retries). */
  error: boolean;
} {
  const { markets, isLoading, error } = useMarkets();
  const weights = useMemo(
    () => marketWeights(def, (symbol) => markets[symbol]?.marketCap),
    [def, markets]
  );
  return { weights, markets, loading: isLoading, error: !!error };
}

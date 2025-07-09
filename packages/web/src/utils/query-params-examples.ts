/**
 * Query Parameters Usage Examples
 *
 * This file demonstrates how to use the useQueryParams hook and types
 * for various application scenarios.
 */

import type {
  SwapQueryParams,
  DepositLiquidityQueryParams,
  WithdrawLiquidityQueryParams,
  StakeInsuranceQueryParams,
  ExploreQueryParams,
} from '@/types/query-params';

// Example usage patterns:

/*
=== SWAP PAGE EXAMPLE ===

// URL: /swap?token_a=XLM&token_b=USDC&in_amount=100

'use client';

import { useQueryParams, QueryParamValidators } from '@/hooks';
import type { SwapQueryParams } from '@/types/query-params';

export default function SwapPage() {
  const { params, hasParams, getParam, getParamAsNumber, updateURL } = useQueryParams<SwapQueryParams>();

  // Access typed parameters
  const tokenA = params.token_a; // string | undefined
  const tokenB = params.token_b; // string | undefined
  const amount = getParamAsNumber('in_amount'); // number | undefined
  const minOutput = getParamAsNumber('out_minimum'); // number | undefined

  // Validation
  const isValidAmount = QueryParamValidators.isValidAmount(params.in_amount);
  const isValidTokenA = QueryParamValidators.isValidTokenSymbol(params.token_a);

  // Update parameters programmatically
  const handleSwapInputChange = (newAmount: string) => {
    updateURL({ in_amount: newAmount });
  };

  // Set multiple parameters at once
  const handleTokenSelect = (tokenA: string, tokenB: string) => {
    updateURL({ 
      token_a: tokenA, 
      token_b: tokenB,
      in_amount: '100' // Default amount
    });
  };

  return (
    <div>
      {hasParams && (
        <div>
          <p>Swap {amount} {tokenA} for {tokenB}</p>
          {minOutput && <p>Minimum output: {minOutput}</p>}
        </div>
      )}
    </div>
  );
}
*/

/*
=== POOLS PAGE EXAMPLE ===

// URL: /pools/deposit?amount=500&token_a=XLM&token_b=USDC

'use client';

import { useQueryParams } from '@/hooks';
import type { DepositLiquidityQueryParams } from '@/types/query-params';

export default function PoolsPage() {
  const { params, getParamAsNumber } = useQueryParams<DepositLiquidityQueryParams>();

  const amount = getParamAsNumber('amount');
  const tokenA = params.token_a;
  const tokenB = params.token_b;
  const poolAddress = params.pool_address;

  // Pre-fill form with URL parameters
  useEffect(() => {
    if (amount) setFormAmount(amount);
    if (tokenA) setSelectedTokenA(tokenA);
    if (tokenB) setSelectedTokenB(tokenB);
  }, [amount, tokenA, tokenB]);

  return <DepositForm />
}
*/

/*
=== INSURANCE PAGE EXAMPLE ===

// URL: /insurance/stake?token=XLM&amount=1000&duration=90

'use client';

import { useQueryParams } from '@/hooks';
import type { StakeInsuranceQueryParams } from '@/types/query-params';

export default function InsurancePage() {
  const { params, getParamAsNumber } = useQueryParams<StakeInsuranceQueryParams>();

  const token = params.token;
  const amount = getParamAsNumber('amount');
  const duration = getParamAsNumber('duration');

  return (
    <StakeForm 
      defaultToken={token}
      defaultAmount={amount}
      defaultDuration={duration}
    />
  );
}
*/

/*
=== EXPLORE PAGE WITH FILTERS ===

// URL: /explore?search=XLM&category=defi&sort_by=volume&sort_order=desc

'use client';

import { useQueryParams } from '@/hooks';
import type { ExploreQueryParams } from '@/types/query-params';

export default function ExplorePage() {
  const { params, updateURL } = useQueryParams<ExploreQueryParams>();

  const searchTerm = params.search || '';
  const category = params.category;
  const sortBy = params.sort_by || 'volume';
  const sortOrder = params.sort_order || 'desc';

  // Update search in URL as user types
  const handleSearch = (term: string) => {
    updateURL({ search: term });
  };

  // Update filters
  const handleCategoryChange = (newCategory: string) => {
    updateURL({ category: newCategory });
  };

  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    updateURL({ 
      sort_by: field as any,
      sort_order: order 
    });
  };

  return (
    <ExploreView 
      searchTerm={searchTerm}
      category={category}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSearch={handleSearch}
      onCategoryChange={handleCategoryChange}
      onSortChange={handleSortChange}
    />
  );
}
*/

/*
=== UTILITY FUNCTION EXAMPLES ===

import { buildQueryString, parseQueryString, QueryParamValidators } from '@/hooks';

// Build URL with parameters
const swapUrl = `/swap${buildQueryString<SwapQueryParams>({
  token_a: 'XLM',
  token_b: 'USDC',
  in_amount: '100'
})}`;
// Result: "/swap?token_a=XLM&token_b=USDC&in_amount=100"

// Parse existing query string
const parsed = parseQueryString<SwapQueryParams>('?token_a=XLM&in_amount=50');
// Result: { token_a: 'XLM', in_amount: '50' }

// Validation examples
const isValid = QueryParamValidators.isValidAmount('100'); // true
const isValidToken = QueryParamValidators.isValidTokenSymbol('XLM'); // true
const isValidPercentage = QueryParamValidators.isValidPercentage('75'); // true
*/

// Common URL patterns you can now support:

export const EXAMPLE_URLS = {
  // Swap examples
  SWAP_XLM_TO_USDC: '/swap?token_a=XLM&token_b=USDC&in_amount=100',
  SWAP_WITH_SLIPPAGE: '/swap?token_a=XLM&token_b=USDC&in_amount=100&out_minimum=95',

  // Liquidity examples
  DEPOSIT_LIQUIDITY: '/pools/deposit?amount=500&token_a=XLM&token_b=USDC',
  WITHDRAW_LIQUIDITY: '/pools/withdraw?amount=250&pool_address=GCXYZ123&percentage=50',

  // Insurance examples
  STAKE_INSURANCE: '/insurance/stake?token=XLM&amount=1000&duration=90',
  UNSTAKE_INSURANCE: '/insurance/unstake?amount=500&stake_id=STAKE123',

  // Browse/Explore examples
  EXPLORE_DEFI: '/explore?category=defi&sort_by=tvl&sort_order=desc',
  SEARCH_TOKENS: '/explore?search=stellar&sort_by=volume',

  // Pool-specific examples
  POOL_DETAILS: '/pools/GCABC123?action=deposit&amount=100',

  // Position examples
  POSITION_MODIFY: '/positions?position_id=POS123&action=modify&amount=50',
} as const;

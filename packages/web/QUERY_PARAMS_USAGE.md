# Query Parameters Hook Documentation

This documentation explains how to use the `useQueryParams` hook and related types for handling URL query parameters in a type-safe manner.

## Overview

The query parameters system allows you to create URLs like:

- `/swap?token_a=XLM&token_b=USDC&in_amount=100`
- `/pools/deposit?amount=500&token_a=XLM&token_b=USDC`
- `/insurance/stake?token=XLM&amount=1000&duration=90`

## Available Types

### Core Types

```typescript
import type {
  SwapQueryParams,
  DepositLiquidityQueryParams,
  WithdrawLiquidityQueryParams,
  StakeInsuranceQueryParams,
  UnstakeInsuranceQueryParams,
  PoolQueryParams,
  PositionQueryParams,
  ExploreQueryParams,
  TransactionQueryParams,
} from '@/types/query-params';
```

### Type Definitions

#### `SwapQueryParams`

```typescript
interface SwapQueryParams {
  token_a?: string; // Source token symbol/address
  token_b?: string; // Destination token symbol/address
  in_amount?: string; // Input amount to swap
  out_minimum?: string; // Minimum output amount (optional)
}
```

#### `DepositLiquidityQueryParams`

```typescript
interface DepositLiquidityQueryParams {
  amount?: string; // Amount to deposit
  token_a?: string; // First token in the pair
  token_b?: string; // Second token in the pair
  pool_address?: string; // Specific pool address (optional)
}
```

#### `StakeInsuranceQueryParams`

```typescript
interface StakeInsuranceQueryParams {
  token?: string; // Token to stake for insurance
  amount?: string; // Amount to stake
  duration?: string; // Staking duration (optional)
}
```

#### `ExploreQueryParams`

```typescript
interface ExploreQueryParams {
  search?: string; // Search term
  category?: string; // Asset category filter
  sort_by?: 'volume' | 'tvl' | 'apy' | 'name'; // Sort criteria
  sort_order?: 'asc' | 'desc'; // Sort direction
}
```

## Hook API

### `useQueryParams<T>()`

```typescript
const {
  params, // Direct access to typed parameters
  hasParams, // Boolean: are there any parameters?
  getParamAsNumber, // Convert parameter to number
  getParamAsBoolean, // Convert parameter to boolean
  setParam, // Update single parameter
  updateURL, // Update multiple parameters
} = useQueryParams<SwapQueryParams>();
```

### Return Values

| Property            | Type                            | Description                            |
| ------------------- | ------------------------------- | -------------------------------------- |
| `params`            | `T`                             | Typed object with all query parameters |
| `hasParams`         | `boolean`                       | True if URL contains any parameters    |
| `getParamAsNumber`  | `(key) => number \| undefined`  | Convert string parameter to number     |
| `getParamAsBoolean` | `(key) => boolean \| undefined` | Convert string parameter to boolean    |
| `setParam`          | `(key, value) => void`          | Update single parameter in URL         |
| `updateURL`         | `(params) => void`              | Update multiple parameters in URL      |

## Usage Examples

### 1. Swap Page

**URL:** `/swap?token_a=XLM&token_b=USDC&in_amount=100`

```typescript
'use client';

import { useQueryParams, QueryParamValidators } from '@/hooks';
import type { SwapQueryParams } from '@/types/query-params';

export default function SwapPage() {
  const { params, hasParams, getParamAsNumber, updateURL } = useQueryParams<SwapQueryParams>();

  // Direct access to typed parameters
  const tokenA = params.token_a;           // string | undefined
  const tokenB = params.token_b;           // string | undefined
  const amount = getParamAsNumber('in_amount');    // number | undefined
  const minOutput = getParamAsNumber('out_minimum'); // number | undefined

  // Pre-fill form with URL parameters
  const [fromToken, setFromToken] = useState(tokenA || '');
  const [toToken, setToToken] = useState(tokenB || '');
  const [inputAmount, setInputAmount] = useState(amount || 0);

  // Update URL when user changes form
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

  // Validation
  const isValidAmount = QueryParamValidators.isValidAmount(params.in_amount);
  const isValidTokenA = QueryParamValidators.isValidTokenSymbol(params.token_a);

  return (
    <div>
      {hasParams && (
        <div className="alert">
          <p>Pre-loading swap: {amount} {tokenA} → {tokenB}</p>
          {minOutput && <p>Minimum output: {minOutput}</p>}
        </div>
      )}
      <SwapForm
        fromToken={fromToken}
        toToken={toToken}
        amount={inputAmount}
        onAmountChange={handleSwapInputChange}
        onTokenSelect={handleTokenSelect}
      />
    </div>
  );
}
```

### 2. Pools Page

**URL:** `/pools/deposit?amount=500&token_a=XLM&token_b=USDC`

```typescript
'use client';

import { useQueryParams } from '@/hooks';
import type { DepositLiquidityQueryParams } from '@/types/query-params';

export default function PoolsPage() {
  const { params, getParamAsNumber } = useQueryParams<DepositLiquidityQueryParams>();

  const amount = getParamAsNumber('amount');      // number | undefined
  const tokenA = params.token_a;                  // string | undefined
  const tokenB = params.token_b;                  // string | undefined
  const poolAddress = params.pool_address;       // string | undefined

  // Pre-fill form with URL parameters
  useEffect(() => {
    if (amount) setFormAmount(amount);
    if (tokenA) setSelectedTokenA(tokenA);
    if (tokenB) setSelectedTokenB(tokenB);
    if (poolAddress) setSelectedPool(poolAddress);
  }, [amount, tokenA, tokenB, poolAddress]);

  return (
    <DepositForm
      defaultAmount={amount}
      defaultTokenA={tokenA}
      defaultTokenB={tokenB}
      defaultPool={poolAddress}
    />
  );
}
```

### 3. Insurance Page

**URL:** `/insurance/stake?token=XLM&amount=1000&duration=90`

```typescript
'use client';

import { useQueryParams } from '@/hooks';
import type { StakeInsuranceQueryParams } from '@/types/query-params';

export default function InsurancePage() {
  const { params, getParamAsNumber } = useQueryParams<StakeInsuranceQueryParams>();

  const token = params.token;                     // string | undefined
  const amount = getParamAsNumber('amount');      // number | undefined
  const duration = getParamAsNumber('duration');  // number | undefined

  return (
    <StakeForm
      defaultToken={token}
      defaultAmount={amount}
      defaultDuration={duration}
    />
  );
}
```

### 4. Explore Page with Filters

**URL:** `/explore?search=XLM&category=defi&sort_by=volume&sort_order=desc`

```typescript
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
```

## Utility Functions

### `buildQueryString<T>(params)`

Build URL query strings programmatically:

```typescript
import { buildQueryString } from '@/hooks';

// Navigation
const navigateToSwap = () => {
  const swapUrl = `/swap${buildQueryString<SwapQueryParams>({
    token_a: 'XLM',
    token_b: 'USDC',
    in_amount: '100',
  })}`;
  // Result: "/swap?token_a=XLM&token_b=USDC&in_amount=100"
  router.push(swapUrl);
};

// Share links
const generateShareLink = (swapConfig: SwapQueryParams) => {
  const queryString = buildQueryString(swapConfig);
  const shareUrl = `${window.location.origin}/swap${queryString}`;
  navigator.clipboard.writeText(shareUrl);
};

// API calls
const fetchPoolData = async (filters: ExploreQueryParams) => {
  const apiUrl = `/api/pools${buildQueryString(filters)}`;
  const response = await fetch(apiUrl);
  return response.json();
};
```

### `parseQueryString<T>(queryString)`

Parse query strings outside React components:

```typescript
import { parseQueryString } from '@/hooks';

// Server-side rendering
export async function getServerSideProps({ query }) {
  const queryString = new URLSearchParams(query as any).toString();
  const swapParams = parseQueryString<SwapQueryParams>(`?${queryString}`);

  const tokenData = await fetchTokenPrices([swapParams.token_a, swapParams.token_b]);

  return { props: { swapParams, tokenData } };
}

// Utility functions
const extractSwapParams = (url: string): SwapQueryParams => {
  const urlObj = new URL(url);
  return parseQueryString<SwapQueryParams>(urlObj.search);
};

// URL validation
const isValidSwapUrl = (url: string): boolean => {
  try {
    const params = parseQueryString<SwapQueryParams>(new URL(url).search);
    return !!(params.token_a && params.token_b);
  } catch {
    return false;
  }
};
```

### `QueryParamValidators`

Validation utilities for common parameter types:

```typescript
import { QueryParamValidators } from '@/hooks';

const isValidAmount = QueryParamValidators.isValidAmount('100'); // true
const isValidToken = QueryParamValidators.isValidTokenSymbol('XLM'); // true
const isValidAddress = QueryParamValidators.isValidAddress('GCABC123'); // true
const isValidPercentage = QueryParamValidators.isValidPercentage('75'); // true
```

## Common URL Patterns

Here are examples of supported URL patterns:

### Swap URLs

- `/swap?token_a=XLM&token_b=USDC&in_amount=100`
- `/swap?token_a=XLM&token_b=USDC&in_amount=100&out_minimum=95`

### Liquidity URLs

- `/pools/deposit?amount=500&token_a=XLM&token_b=USDC`
- `/pools/withdraw?amount=250&pool_address=GCXYZ123&percentage=50`

### Insurance URLs

- `/insurance/stake?token=XLM&amount=1000&duration=90`
- `/insurance/unstake?amount=500&stake_id=STAKE123`

### Browse/Explore URLs

- `/explore?category=defi&sort_by=tvl&sort_order=desc`
- `/explore?search=stellar&sort_by=volume`

### Pool-Specific URLs

- `/pools/GCABC123?action=deposit&amount=100`

### Position URLs

- `/positions?position_id=POS123&action=modify&amount=50`

## Best Practices

1. **Type Safety**: Always use the appropriate type parameter:

   ```typescript
   useQueryParams<SwapQueryParams>(); // ✅ Type-safe
   useQueryParams(); // ❌ Less safe
   ```

2. **Parameter Access**: Use direct property access for strings:

   ```typescript
   const token = params.token_a; // ✅ Direct access
   const amount = getParamAsNumber('in_amount'); // ✅ Type conversion
   ```

3. **URL Updates**: Use `updateURL` for multiple parameters:

   ```typescript
   updateURL({ token_a: 'XLM', token_b: 'USDC' }); // ✅ Multiple params
   setParam('token_a', 'XLM'); // ✅ Single param
   ```

4. **Validation**: Always validate parameters when needed:

   ```typescript
   const amount = getParamAsNumber('amount');
   if (amount && QueryParamValidators.isValidAmount(amount.toString())) {
     // Use validated amount
   }
   ```

5. **Default Values**: Provide fallbacks for optional parameters:
   ```typescript
   const sortBy = params.sort_by || 'volume'; // ✅ With fallback
   const search = params.search || ''; // ✅ With fallback
   ```

## Integration with React State

### Form Pre-filling

```typescript
const { params, getParamAsNumber } = useQueryParams<SwapQueryParams>();

// Pre-fill form state from URL
const [fromToken, setFromToken] = useState(params.token_a || '');
const [toToken, setToToken] = useState(params.token_b || '');
const [amount, setAmount] = useState(getParamAsNumber('in_amount') || 0);

// Update URL when form changes
const handleFormSubmit = () => {
  updateURL({
    token_a: fromToken,
    token_b: toToken,
    in_amount: amount.toString(),
  });
};
```

### Conditional Rendering

```typescript
const { hasParams, params } = useQueryParams<SwapQueryParams>();

return (
  <div>
    {hasParams ? (
      <AlertBanner>Pre-loaded configuration from URL</AlertBanner>
    ) : (
      <WelcomeBanner>Choose your swap parameters</WelcomeBanner>
    )}
  </div>
);
```

This documentation provides everything needed to implement and use query parameters effectively across the application.

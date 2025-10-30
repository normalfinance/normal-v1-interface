// -----------------------------------------------------------------------------
//  Common helpers
// -----------------------------------------------------------------------------
export interface TokenAmount {
  address: string;
  symbol: string;
  iconUrl: string;
  amount: number;
}

interface ActivityBase {
  id: string;
  timestamp: number;
}

// -----------------------------------------------------------------------------
//  Individual activity variants
// -----------------------------------------------------------------------------
export interface SentActivity extends ActivityBase {
  type: 'Sent';
  address: string; // ⬅ where the funds went
  token: TokenAmount;
}

export interface ReceiveActivity extends ActivityBase {
  type: 'Receive';
  address: string; // ⬅ where the funds came from
  token: TokenAmount;
}

export interface SwapActivity extends ActivityBase {
  type: 'Swap';
  sell: TokenAmount;
  buy: TokenAmount;
}

export interface AddLiquidityActivity extends ActivityBase {
  type: 'Add Liquidity';
  tokenA: TokenAmount;
  tokenB: TokenAmount;
}

export interface RemoveLiquidityActivity extends ActivityBase {
  type: 'Remove Liquidity';
  tokenA: TokenAmount;
  tokenB: TokenAmount;
}

// -----------------------------------------------------------------------------
//  Discriminated union
// -----------------------------------------------------------------------------
export type Activity =
  | SentActivity
  | ReceiveActivity
  | SwapActivity
  | AddLiquidityActivity
  | RemoveLiquidityActivity;

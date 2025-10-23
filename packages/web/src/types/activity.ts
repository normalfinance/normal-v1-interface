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

export interface ReceivedActivity extends ActivityBase {
  type: 'Received';
  address: string; // ⬅ where the funds came from
  token: TokenAmount;
}

export interface SwappedActivity extends ActivityBase {
  type: 'Swapped';
  asset: string;
  sell: TokenAmount;
  buy: TokenAmount;
}

export interface AddLiquidityActivity extends ActivityBase {
  type: 'Add Liquidity';
  asset: string;
  tokenB: TokenAmount;
}

export interface RemoveLiquidityActivity extends ActivityBase {
  type: 'Remove Liquidity';
  asset: string;
  tokenB: TokenAmount;
}

// -----------------------------------------------------------------------------
//  Discriminated union
// -----------------------------------------------------------------------------
export type Activity =
  | SentActivity
  | ReceivedActivity
  | SwappedActivity
  | AddLiquidityActivity
  | RemoveLiquidityActivity;

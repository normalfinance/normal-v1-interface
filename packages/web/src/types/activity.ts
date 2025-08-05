// -----------------------------------------------------------------------------
//  Common helpers
// -----------------------------------------------------------------------------
export interface TokenAmount {
  token: string;
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
  asset: TokenAmount;
}

export interface ReceivedActivity extends ActivityBase {
  type: 'Received';
  address: string; // ⬅ where the funds came from
  asset: TokenAmount;
}

export interface SwappedActivity extends ActivityBase {
  type: 'Swapped';
  sell: TokenAmount;
  buy: TokenAmount;
}

export interface AddLiquidityActivity extends ActivityBase {
  type: 'Add Liquidity';
  tokenB: TokenAmount;
}

export interface RemoveLiquidityActivity extends ActivityBase {
  type: 'Remove Liquidity';
  tokenB: TokenAmount;
}

export interface StakeActivity extends ActivityBase {
  type: 'Stake';
  asset: TokenAmount;
}

export interface UnstakeActivity extends ActivityBase {
  type: 'Unstake';
  asset: TokenAmount;
}

// -----------------------------------------------------------------------------
//  Discriminated union
// -----------------------------------------------------------------------------
export type Activity =
  | SentActivity
  | ReceivedActivity
  | SwappedActivity
  | AddLiquidityActivity
  | RemoveLiquidityActivity
  | StakeActivity
  | UnstakeActivity;

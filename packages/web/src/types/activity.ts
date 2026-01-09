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

export interface MintActivity extends ActivityBase {
  type: 'Mint';
  symbol: string;
  iconUrl: string;
  amount: number;
}

export interface RedeemActivity extends ActivityBase {
  type: 'Redeem';
  symbol: string;
  iconUrl: string;
  amount: number;
}

export interface TradeActivity extends ActivityBase {
  type: 'Trade';
  symbol: string;
  iconUrl: string;
  amount: number;
}

export interface AddLiquidityActivity extends ActivityBase {
  type: 'Add Liquidity';
  symbol: string;
  iconUrl: string;
  amount: number;
}

export interface RemoveLiquidityActivity extends ActivityBase {
  type: 'Remove Liquidity';
  symbol: string;
  iconUrl: string;
  amount: number;
}

// -----------------------------------------------------------------------------
//  Discriminated union
// -----------------------------------------------------------------------------
export type Activity =
  | SentActivity
  | ReceiveActivity
  | MintActivity
  | RedeemActivity
  | TradeActivity
  | AddLiquidityActivity
  | RemoveLiquidityActivity;

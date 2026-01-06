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
  asset: TokenAmount;
}

export interface RedeemActivity extends ActivityBase {
  type: 'Redeem';
  asset: TokenAmount;
}

export interface TradeActivity extends ActivityBase {
  type: 'Trade';
  asset: TokenAmount;
}

export interface AddLiquidityActivity extends ActivityBase {
  type: 'Add Liquidity';
  asset: TokenAmount;
}

export interface RemoveLiquidityActivity extends ActivityBase {
  type: 'Remove Liquidity';
  asset: TokenAmount;
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

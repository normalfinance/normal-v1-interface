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
  txHash: string | null;
}

export interface ReceiveActivity extends ActivityBase {
  type: 'Receive';
  address: string; // ⬅ where the funds came from
  token: TokenAmount;
  txHash: string | null;
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

export interface BuyActivity extends ActivityBase {
  type: 'Buy';
  symbol: string;
  iconUrl: string;
  amount: number;
  provider?: string;
}

export interface SellActivity extends ActivityBase {
  type: 'Sell';
  symbol: string;
  iconUrl: string;
  amount: number;
  provider?: string;
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

export interface SavingsDepositActivity extends ActivityBase {
  type: 'Savings Deposit';
  amount: string;
  vaultAddress: string;
  txHash: string | null;
}

export interface SavingsWithdrawActivity extends ActivityBase {
  type: 'Savings Withdraw';
  amount: string;
  vaultAddress: string;
  txHash: string | null;
}

export interface SwapActivity extends ActivityBase {
  type: 'Swap';
  tokenIn: TokenAmount;
  tokenOut: TokenAmount;
  txHash: string | null;
}

// -----------------------------------------------------------------------------
//  Discriminated union
// -----------------------------------------------------------------------------
export type Activity =
  | SentActivity
  | ReceiveActivity
  | MintActivity
  | RedeemActivity
  | BuyActivity
  | SellActivity
  | AddLiquidityActivity
  | RemoveLiquidityActivity
  | SavingsDepositActivity
  | SavingsWithdrawActivity
  | SwapActivity;

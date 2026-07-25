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
  confirmed?: boolean; // undefined = unknown (Stellar); false = pending (BTC mempool)
  /** This send is the on-chain leg of a fiat off-ramp (e.g. Coinbase sell). */
  offramp?: boolean;
  /** Off-ramp progress, reconciled against the provider (pending → completed). */
  offrampStatus?: 'pending' | 'completed' | 'failed';
  /** Off-ramp provider label (e.g. "Coinbase"). */
  offrampProvider?: string;
}

export interface ReceiveActivity extends ActivityBase {
  type: 'Receive';
  address: string; // ⬅ where the funds came from
  token: TokenAmount;
  txHash: string | null;
  confirmed?: boolean; // undefined = unknown (Stellar); false = pending (BTC mempool)
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
  /** On/off-ramp still in flight (e.g. MoneyGram awaiting the cash drop-off). */
  pending?: boolean;
  /** Ramp ended unsuccessfully (expired, error, no market…). */
  failed?: boolean;
}

export interface SellActivity extends ActivityBase {
  type: 'Sell';
  symbol: string;
  iconUrl: string;
  amount: number;
  provider?: string;
  /** On/off-ramp still in flight (e.g. MoneyGram cash pickup not collected). */
  pending?: boolean;
  /** Ramp ended unsuccessfully (expired, error, no market…). */
  failed?: boolean;
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
  /** Cross-chain (LI.FI) swaps stay pending until the bridge delivers. */
  pending?: boolean;
  /** Cross-chain swap whose source tx never landed / the bridge failed. */
  failed?: boolean;
  /** Bridge returned the funds — the swap didn't deliver (funds are safe). */
  refunded?: boolean;
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

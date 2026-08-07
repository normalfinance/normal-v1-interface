export interface VaultSnapshotRow {
  date: string; // ISO timestamp
  vault_address: string;
  network: string;
  tvl_usd: number;
  pps: number;
  total_supply: number;
}

export interface VolumeDailyRow {
  date: string;
  type: 'savings_deposit' | 'savings_withdraw' | 'swap' | 'onramp';
  network: string;
  volume_usd: number;
  fee_usd: number;
  tx_count: number;
}

export interface WalletActivityRow {
  date: string;
  wallet_address: string;
  activity_type: 'savings' | 'swap' | 'onramp';
  network: string;
}

export interface YieldSnapshotRow {
  snapshot_date: string;
  wallet_address: string;
  vault_address: string;
  network: string;
  total_interest_earned: number;
  total_deposited: number;
  current_position: number;
  roi: number;
}

export interface ReferralRow {
  date: string;
  referral_code: string;
  referee_wallet: string;
  action: string;
  network: string;
}

export interface UserRow {
  user_id: string;
  email: string;
  created_at: string;
  network: string;
}

export interface LinkedWalletRow {
  supabase_uid: string;
  wallet_address: string;
  created_at: string;
  last_used_at: string;
  network: string;
}

export interface TransactionLogRow {
  date: string; // ISO timestamp
  wallet_address: string;
  action_type: string; // 'swap' | 'savings_deposit' | 'savings_withdraw'
  asset_in: string; // token the user sent (XLM, USDC, nUSDC)
  asset_out: string; // token the user received
  amount: number; // amount of asset_in
  fee_usd: number; // Normal fee charged
  tx_hash: string;
  network: string;
}

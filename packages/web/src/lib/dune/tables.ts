export interface VaultSnapshotRow {
  date: string;           // ISO timestamp
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

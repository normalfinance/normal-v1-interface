export interface NetworkConfig {
  // Network
  NETWORK_PASSPHRASE: string;
  HORIZON_URL: string;
  /** Horizon endpoints in preference order (primary first). Readers that can
   *  fail over use this; HORIZON_URL stays the single primary for writers.
   *  Optional so existing config literals keep compiling. */
  HORIZON_URLS?: string[];
  RPC_URL: string;

  // Normal Accounts
  NORMAL_ISSUER: string;
  NORMAL_ADMIN: string;
  NORMAL_DISTRIBUTOR: string;
  NORMAL_HOT_A: string;

  // External Contracts
  DEFINDEX_VAULT_ADDRESS: string;
  BLEND_USDC_ADDRESS?: string;
  BLEND_USDC_ISSUER?: string;

  // Stellar
  XLM_ADDRESS: string;
  XLM_DECIMALS: number;
  USDC_ADDRESS: string;
  USDC_DECIMALS: number;
  USDC_ISSUER: string;

  // Oracle
  REFLECTOR_EXTERNAL_ORACLE_ADDRESS: string;
  REFLECTOR_PUBNET_ORACLE_ADDRESS: string;

  // Supabase
  EVENTS_TABLENAME: string;
}

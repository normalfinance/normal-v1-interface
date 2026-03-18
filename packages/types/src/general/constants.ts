export interface NetworkConfig {
  // Network
  NETWORK_PASSPHRASE: string;
  HORIZON_URL: string;
  RPC_URL: string;

  // Normal Accounts
  NORMAL_ISSUER: string;
  NORMAL_ADMIN: string;
  NORMAL_DISTRIBUTOR: string;
  NORMAL_HOT_A: string;

  // External Contracts
  AQUA_ROUTER_ADDRESS: string;
  DEFINDEX_VAULT_ADDRESS: string;

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

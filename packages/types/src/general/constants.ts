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

  // Normal Contracts
  POOL_ROUTER_ADDRESS: string;
  POOL_PLANE_ADDRESS: string;
  LIQUIDITY_CALCULATOR_ADDRESS: string;
  CONFIG_STORAGE_ADDRESS: string;
  REWARDS_GAUGE_ADDRESS: string;
  INDEX_FACTORY_ADDRESS: string;

  // Stellar
  XLM_ADDRESS: string;
  XLM_DECIMALS: number;
  USDC_ADDRESS: string;
  USDC_DECIMALS: number;

  // Oracle
  REFLECTOR_EXTERNAL_ORACLE_ADDRESS: string;
  REFLECTOR_PUBNET_ORACLE_ADDRESS: string;

  // Supabase
  EVENTS_TABLENAME: string;
}

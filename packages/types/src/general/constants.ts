export interface NetworkConfig {
  // network
  NETWORK_PASSPHRASE: string;
  HORIZON_URL: string;
  RPC_URL: string;

  // accounts
  NORMAL_TOKEN_ISSUER: string;

  // contracts
  POOL_ROUTER_ADDRESS: string;
  POOL_PLANE_ADDRESS: string;
  LIQUIDITY_CALCULATOR_ADDRESS: string;
  CONFIG_STORAGE_ADDRESS: string;
  REWARDS_GAUGE_ADDRESS: string;

  // stellar
  XLM_ADDRESS: string;
  XLM_DECIMALS: number;
  USDC_ADDRESS: string;
  USDC_DECIMALS: number;

  // oracle
  REFLECTOR_EXTERNAL_ORACLE_ADDRESS: string;
  REFLECTOR_PUBNET_ORACLE_ADDRESS: string;

  // supabase
  EVENTS_TABLENAME: string;
}

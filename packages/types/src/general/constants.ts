import { Account } from '@stellar/stellar-sdk';

export interface NetworkConfig {
  // network
  TESTING_SOURCE: Account;
  NETWORK_PASSPHRASE: string;
  HORIZON_URL: string;
  RPC_URL: string;

  // accounts
  NORMAL_TOKEN_ISSUER: string;

  // contracts
  POOL_ROUTER_ADDRESS: string;
  POOL_SWAP_FEE_ADDRESS: string;
  INSURANCE_FUND_ADDRESS: string;
  ORACLE_REGISTRY_ADDRESS: string;
  LIQUIDITY_CALCULATOR_ADDRESS: string;

  // stellar
  XLM_ADDRESS: string;
  XLM_DECIMALS: number;

  // oracle
  REFLECTOR_ORACLE_ADDRESS: string;

  // supabase
  EVENTS_TABLENAME: string;
}

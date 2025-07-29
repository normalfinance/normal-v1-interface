import { Account } from '@stellar/stellar-sdk';

export interface NetworkConfig {
  // network
  TESTING_SOURCE: Account;
  NETWORK_PASSPHRASE: string;
  RPC_URL: string;
  // contracts
  POOL_ROUTER_ADDRESS: string;
  POOL_SWAP_FEE_ADDRESS: string;
  BUFFER_ADDRESS: string;
  INSURANCE_FUND_ADDRESS: string;
  ORACLE_REGISTRY_ADDRESS: string;
  LIQUIDITY_CALCULATOR_ADDRESS: string;
  // XLM
  XLM_ADDRESS: string;
  XLM_DECIMALS: number;
  // oracles
  REFLECTOR_ORACLE_ADDRESS: string;
}

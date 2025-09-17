import { NetworkConfig } from '@normalfinance/types';
import { Account, Networks } from '@stellar/stellar-sdk';
import { getCurrentNetwork, getNetworkTableName } from '../network';

const RPC_API_KEY = process.env.RPC_API_KEY ?? '';

const TESTNET_CONFIG: NetworkConfig = {
  // network
  TESTING_SOURCE: new Account('GCRVHVIR7B6PBUYIAKHS24RKALHZLIRM7GPLOAYRCZXQF6SSV3IJU3XO', '123'),
  NETWORK_PASSPHRASE: Networks.TESTNET,
  HORIZON_URL: process.env.NEXT_PUBLIC_TESTNET_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  RPC_URL: RPC_API_KEY
    ? `https://testnet.stellar.validationcloud.io/v1/${RPC_API_KEY}`
    : process.env.NEXT_PUBLIC_TESTNET_RPC_URL || 'https://soroban-testnet.stellar.org',

  // accounts
  NORMAL_TOKEN_ISSUER: process.env.NEXT_PUBLIC_TESTNET_TOKEN_ISSUER || '',

  // contracts
  POOL_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_POOL_ROUTER || '',
  ORACLE_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_ORACLE_REGISTRY || '',
  INSURANCE_FUND_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_INSURANCE_FUND || '',
  POOL_SWAP_FEE_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_POOL_SWAP_FEE || '',
  LIQUIDITY_CALCULATOR_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_LIQUIDITY_CALCULATOR || '',

  // stellar
  XLM_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_XLM_ADDRESS || '',
  XLM_DECIMALS: 7,

  // oracle
  REFLECTOR_ORACLE_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_REFLECTOR_ORACLE || '',

  // supabase
  EVENTS_TABLENAME: getNetworkTableName('normal_contract_events'),
};

const MAINNET_CONFIG: NetworkConfig = {
  // network
  TESTING_SOURCE: new Account('GCRVHVIR7B6PBUYIAKHS24RKALHZLIRM7GPLOAYRCZXQF6SSV3IJU3XO', '123'),
  NETWORK_PASSPHRASE: Networks.PUBLIC,
  HORIZON_URL: process.env.NEXT_PUBLIC_MAINNET_HORIZON_URL || 'https://horizon.stellar.org',
  RPC_URL: RPC_API_KEY
    ? `https://mainnet.stellar.validationcloud.io/v1/${RPC_API_KEY}`
    : process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://soroban.stellar.org',

  // accounts
  NORMAL_TOKEN_ISSUER: process.env.NEXT_PUBLIC_MAINNET_TOKEN_ISSUER || '',

  // contracts
  POOL_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_POOL_ROUTER || '',
  POOL_SWAP_FEE_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_POOL_SWAP_FEE || '',
  INSURANCE_FUND_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_INSURANCE_FUND || '',
  ORACLE_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_ORACLE_REGISTRY || '',
  LIQUIDITY_CALCULATOR_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_LIQUIDITY_CALCULATOR || '',

  // stellar
  XLM_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_XLM_ADDRESS || '',
  XLM_DECIMALS: 7,

  // oracle
  REFLECTOR_ORACLE_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_REFLECTOR_ORACLE || '',

  // supabase
  EVENTS_TABLENAME: getNetworkTableName('normal_contract_events'),
};

/**
 * Get the current network configuration based on NEXT_PUBLIC_NETWORK environment variable
 */
function getStellarConfig(): NetworkConfig {
  const network = getCurrentNetwork();
  console.log('[getStellarConfig] network', network);
  return network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG;
}

// Export the current stellar configuration
export const StellarConfig: NetworkConfig = getStellarConfig();

console.log('[StellarConfig] StellarConfig', StellarConfig);

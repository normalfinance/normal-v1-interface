import { NetworkConfig } from '@normalfinance/types';
import { Account, Networks } from '@stellar/stellar-sdk';
import { getCurrentNetwork } from '../network';
import { logger } from '../logger';

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
  POOL_PLANE_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_POOL_PLANE || '',
  LIQUIDITY_CALCULATOR_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_LIQUIDITY_CALCULATOR || '',
  CONFIG_STORAGE_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_CONFIG_STORAGE || '',
  REWARDS_GAUGE_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_REWARDS_GAUGE || '',

  // stellar
  XLM_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_XLM_ADDRESS || '',
  XLM_DECIMALS: 7,
  USDC_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_USDC_ADDRESS || '',
  USDC_DECIMALS: 7,

  // oracle
  REFLECTOR_ORACLE_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_REFLECTOR_ORACLE || '',

  // supabase
  EVENTS_TABLENAME: 'normal_contract_events',
};

const MAINNET_CONFIG: NetworkConfig = {
  // network
  TESTING_SOURCE: new Account('GCRVHVIR7B6PBUYIAKHS24RKALHZLIRM7GPLOAYRCZXQF6SSV3IJU3XO', '123'),
  NETWORK_PASSPHRASE: Networks.PUBLIC,
  HORIZON_URL: process.env.NEXT_PUBLIC_MAINNET_HORIZON_URL || 'https://horizon.stellar.org',
  RPC_URL: 'https://rpc.lightsail.network/',

  // accounts
  NORMAL_TOKEN_ISSUER: process.env.NEXT_PUBLIC_MAINNET_TOKEN_ISSUER || '',

  // contracts
  POOL_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_POOL_ROUTER || '',
  POOL_PLANE_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_POOL_PLANE || '',
  LIQUIDITY_CALCULATOR_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_LIQUIDITY_CALCULATOR || '',
  CONFIG_STORAGE_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_CONFIG_STORAGE || '',
  REWARDS_GAUGE_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_REWARDS_GAUGE || '',

  // stellar
  XLM_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_XLM_ADDRESS || '',
  XLM_DECIMALS: 7,
  USDC_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_USDC_ADDRESS || '',
  USDC_DECIMALS: 7,

  // oracle
  REFLECTOR_ORACLE_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_REFLECTOR_ORACLE || '',

  // supabase
  EVENTS_TABLENAME: 'normal_contract_events',
};

/**
 * Get the current network configuration based on NEXT_PUBLIC_NETWORK environment variable
 */
function getStellarConfig(): NetworkConfig {
  const network = getCurrentNetwork();
  logger.log('[getStellarConfig] network', network);
  return network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG;
}

// Export the current stellar configuration
export const StellarConfig: NetworkConfig = getStellarConfig();

logger.log('[StellarConfig] StellarConfig', StellarConfig);

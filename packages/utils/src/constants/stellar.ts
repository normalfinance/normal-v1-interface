import { NetworkConfig } from '@normalfinance/types';
import { getCurrentNetwork } from '../network';
import { logger } from '../logger';

const TESTNET_CONFIG: NetworkConfig = {
  // Network,
  NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  HORIZON_URL: process.env.NEXT_PUBLIC_TESTNET_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  RPC_URL: process.env.NEXT_PUBLIC_TESTNET_RPC_URL || 'https://soroban-testnet.stellar.org',

  // Normal Accounts
  NORMAL_ISSUER: process.env.NEXT_PUBLIC_TESTNET_ISSUER || '',
  NORMAL_ADMIN: process.env.NEXT_PUBLIC_TESTNET_ADMIN || '',
  NORMAL_DISTRIBUTOR: process.env.NEXT_PUBLIC_TESTNET_DISTRIBUTOR || '',
  NORMAL_HOT_A: process.env.NEXT_PUBLIC_TESTNET_HOT_A || '',

  // Normal Contracts
  POOL_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_POOL_ROUTER || '',
  POOL_PLANE_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_POOL_PLANE || '',
  LIQUIDITY_CALCULATOR_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_LIQUIDITY_CALCULATOR || '',
  CONFIG_STORAGE_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_CONFIG_STORAGE || '',
  REWARDS_GAUGE_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_REWARDS_GAUGE || '',
  INDEX_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_INDEX_FACTORY || '',

  // Stellar
  XLM_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_XLM_ADDRESS || '',
  XLM_DECIMALS: 7,
  USDC_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_USDC_ADDRESS || '',
  USDC_DECIMALS: 7,

  // Oracle
  REFLECTOR_EXTERNAL_ORACLE_ADDRESS:
    process.env.NEXT_PUBLIC_TESTNET_REFLECTOR_EXTERNAL_ORACLE || '',
  REFLECTOR_PUBNET_ORACLE_ADDRESS: process.env.NEXT_PUBLIC_TESTNET_REFLECTOR_PUBNET_ORACLE || '',

  // Supabase
  EVENTS_TABLENAME: 'normal_contract_events',
};

const MAINNET_CONFIG: NetworkConfig = {
  // Network
  NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015',
  HORIZON_URL: process.env.NEXT_PUBLIC_MAINNET_HORIZON_URL || 'https://horizon.stellar.org',
  RPC_URL: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://rpc.lightsail.network/',

  // Normal Accounts
  NORMAL_ISSUER: process.env.NEXT_PUBLIC_MAINNET_ISSUER || '',
  NORMAL_ADMIN: process.env.NEXT_PUBLIC_MAINNET_ADMIN || '',
  NORMAL_DISTRIBUTOR: process.env.NEXT_PUBLIC_MAINNET_DISTRIBUTOR || '',
  NORMAL_HOT_A: process.env.NEXT_PUBLIC_MAINNET_HOT_A || '',

  // Normal Contracts
  POOL_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_POOL_ROUTER || '',
  POOL_PLANE_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_POOL_PLANE || '',
  LIQUIDITY_CALCULATOR_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_LIQUIDITY_CALCULATOR || '',
  CONFIG_STORAGE_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_CONFIG_STORAGE || '',
  REWARDS_GAUGE_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_REWARDS_GAUGE || '',
  INDEX_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_INDEX_FACTORY || '',

  // Stellar
  XLM_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_XLM_ADDRESS || '',
  XLM_DECIMALS: 7,
  USDC_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_USDC_ADDRESS || '',
  USDC_DECIMALS: 7,

  // Oracle
  REFLECTOR_EXTERNAL_ORACLE_ADDRESS:
    process.env.NEXT_PUBLIC_MAINNET_REFLECTOR_EXTERNAL_ORACLE || '',
  REFLECTOR_PUBNET_ORACLE_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_REFLECTOR_PUBNET_ORACLE || '',

  // Supabase
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

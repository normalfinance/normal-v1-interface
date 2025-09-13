import { NetworkConfig } from '@normalfinance/types';
import { Account, Networks } from '@stellar/stellar-sdk';
import { getCurrentNetwork, getNetworkTableName } from '../network';

const RPC_API_KEY = process.env.RPC_API_KEY ?? '';

const TESTNET_CONFIG: NetworkConfig = {
  // network
  TESTING_SOURCE: new Account('GCRVHVIR7B6PBUYIAKHS24RKALHZLIRM7GPLOAYRCZXQF6SSV3IJU3XO', '123'),
  NETWORK_PASSPHRASE: Networks.TESTNET,
  HORIZON_URL: 'https://horizon-testnet.stellar.org',
  RPC_URL: RPC_API_KEY
    ? `https://testnet.stellar.validationcloud.io/v1/${RPC_API_KEY}`
    : 'https://soroban-testnet.stellar.org',

  // accounts
  NORMAL_TOKEN_ISSUER: 'GB55TEPZCAPVA5QKOGTKEBLGJNCP4LSEIM65PMKYKVTABMFCKQNKPJ2H',

  // contracts
  POOL_ROUTER_ADDRESS: 'CCYQV4LBUROO7IPWMQHGPRSNYM3BXEAHJYU5RAO52TJRG7KP23TY2C63',
  ORACLE_REGISTRY_ADDRESS: 'CB4OHJ5KAEY2O5ZOFWOFYOCP6WL5FSZEPO4GVJLW4PBJZRWM4IID7QDF',
  INSURANCE_FUND_ADDRESS: 'CD5R75V747J4YQ3OMM2I7ZWD57DL4VVVWNQMXTYUUYMLGVUQVFLEMG65',
  POOL_SWAP_FEE_ADDRESS: '',
  LIQUIDITY_CALCULATOR_ADDRESS: 'CA2F6PYW6V7Z4NPV35WALPI5GSPNDADQ7FI5H6ZI5OZCPZROP3JCN4TX',

  // stellar
  XLM_ADDRESS: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  XLM_DECIMALS: 7,

  // oracle
  REFLECTOR_ORACLE_ADDRESS: 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63',

  // supabase
  EVENTS_TABLENAME: getNetworkTableName('normal_contract_events'),
};

const MAINNET_CONFIG: NetworkConfig = {
  // network
  TESTING_SOURCE: new Account('GCRVHVIR7B6PBUYIAKHS24RKALHZLIRM7GPLOAYRCZXQF6SSV3IJU3XO', '123'),
  NETWORK_PASSPHRASE: Networks.PUBLIC,
  HORIZON_URL: 'https://horizon.stellar.org',
  RPC_URL: RPC_API_KEY
    ? `https://mainnet.stellar.validationcloud.io/v1/${RPC_API_KEY}`
    : 'https://soroban.stellar.org',

  // accounts
  NORMAL_TOKEN_ISSUER: process.env.NEXT_PUBLIC_MAINNET_TOKEN_ISSUER || '',

  // contracts
  POOL_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_POOL_ROUTER || '',
  POOL_SWAP_FEE_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_POOL_SWAP_FEE || '',
  INSURANCE_FUND_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_INSURANCE_FUND || '',
  ORACLE_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_ORACLE_REGISTRY || '',
  LIQUIDITY_CALCULATOR_ADDRESS: process.env.NEXT_PUBLIC_MAINNET_LIQUIDITY_CALCULATOR || '',

  // stellar
  XLM_ADDRESS: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
  XLM_DECIMALS: 7,

  // oracle
  REFLECTOR_ORACLE_ADDRESS: 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',

  // supabase
  EVENTS_TABLENAME: getNetworkTableName('normal_contract_events'),
};

/**
 * Get the current network configuration based on NEXT_PUBLIC_NETWORK environment variable
 */
function getStellarConfig(): NetworkConfig {
  const network = getCurrentNetwork();
  return network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG;
}

// Export the current stellar configuration
export const StellarConfig: NetworkConfig = getStellarConfig();

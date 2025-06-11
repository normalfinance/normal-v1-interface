import { Account } from '@stellar/stellar-sdk';

export const TESTING_SOURCE: Account = new Account(
  'GBUHRWJBXS4YAEOVDRWFW6ZC5LLF2SAOMATH4I6YOTZYHE65FQRFOKG2',
  '1'
);

/**
 * The Soroban network passphrase used to initialize this library.
 */
export const NETWORK_PASSPHRASE: string = 'Public Global Stellar Network ; September 2015';

/**
 * The Soroban RPC endpoint used to initialize this library.
 */
export const RPC_URL: string =
  'https://mainnet.stellar.validationcloud.io/v1/YcyPYotN_b6-_656rpr0CabDwlGgkT42NCzPVIqcZh0';

/**
 * Pool Router contract address
 */
export const POOL_ROUTER_ADDRESS: string =
  'CB4SVAWJA6TSRNOJZ7W2AWFW46D5VR4ZMFZKDIKXEINZCZEGZCJZCKMI';

/**
 * Pool Swap Fee contract address
 */
export const POOL_SWAP_FEE_ADDRESS: string =
  'CB4SVAWJA6TSRNOJZ7W2AWFW46D5VR4ZMFZKDIKXEINZCZEGZCJZCKMI';

/**
 * Buffer contract address
 */
export const BUFFER_ADDRESS: string = 'CB4SVAWJA6TSRNOJZ7W2AWFW46D5VR4ZMFZKDIKXEINZCZEGZCJZCKMI';

/**
 * Insurance Fund contract address
 */
export const INSURANCE_FUND_ADDRESS: string =
  'CB4SVAWJA6TSRNOJZ7W2AWFW46D5VR4ZMFZKDIKXEINZCZEGZCJZCKMI';

/**
 * Oracle Registry contract address
 */
export const ORALCE_REGISTY_ADDRESS: string =
  'CB4SVAWJA6TSRNOJZ7W2AWFW46D5VR4ZMFZKDIKXEINZCZEGZCJZCKMI';

export const NORMAL_BASE_FEE = '100000';

export const XLM_ADDRESS: string = 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA';

export const XLM_DECIMALS: number = 7;

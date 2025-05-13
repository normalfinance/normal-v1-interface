import { Account } from '@stellar/stellar-sdk';

export const TESTING_SOURCE: Account = new Account(
  'GBUHRWJBXS4YAEOVDRWFW6ZC5LLF2SAOMATH4I6YOTZYHE65FQRFOKG2',
  '1'
);

/**
 * The Soroban network passphrase used to initialize this library.
 */
export const SOROBAN_NETWORK_PASSPHRASE: string = 'Public Global Stellar Network ; September 2015';

/**
 * The Soroban RPC endpoint used to initialize this library.
 */
export const SOROBAN_RPC_URL: string =
  'https://rpc.ankr.com/premium-http/stellar_horizon/8323417d97bbb6fa1676b63bcb11ab8143e99951df5fffd39872ed2e7057aa39';

/**
 * The Soroban Testnet RPC endpoint used to initialize this library.
 */
export const SOROBAN_TESTNET_RPC_URL: string = 'https://soroban-testnet.stellar.org';

/**
 * Market factory contract address
 */
export const POOL_ROUTER_ADDRESS: string =
  'CDKHW2DSABADOE3LB7UFJADES5OH6O7CZIHBTRNVU4UYWE3WWNKR7SMM';

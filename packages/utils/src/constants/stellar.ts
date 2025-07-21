import { Account } from '@stellar/stellar-sdk';

export const TESTING_SOURCE: Account = new Account(
  'GCRVHVIR7B6PBUYIAKHS24RKALHZLIRM7GPLOAYRCZXQF6SSV3IJU3XO',
  '123'
);

/**
 * The Soroban network passphrase used to initialize this library.
 */
export const NETWORK_PASSPHRASE: string = 'Public Global Stellar Network ; September 2015';

/**
 * The Soroban RPC endpoint used to initialize this library.
 */
export const RPC_URL: string = 'https://soroban-testnet.stellar.org';

/**
 * Pool Router contract address
 */
export const POOL_ROUTER_ADDRESS: string =
  'CC2CCFGMCEH7XJ34WXHIQ3MDRLPMF6UVELDL4MTX5X5DSZSG6DH24ZM5';

/**
 * Pool Swap Fee contract address
 */
export const POOL_SWAP_FEE_ADDRESS: string =
  'CBQASVDLRJTGYFQBXEUVZUSS7CLZDLVWS4XNZ4TLHSPOCQAYAUJ3NKW6';

/**
 * Buffer contract address
 */
export const BUFFER_ADDRESS: string = 'CCTEOV6E6VHBAQXVHPFR7ZRAJTIKBFNOVV7RNSLC7FMEPXSIIQJNOKGC';

/**
 * Insurance Fund contract address
 */
export const INSURANCE_FUND_ADDRESS: string =
  'CBNEAYC3XYACNOXTCDKPX5R5LYBUHNCQ6TPMHTVEKWHH2JZJBXW6DIXQ';

/**
 * Oracle Registry contract address
 */
export const ORALCE_REGISTY_ADDRESS: string =
  'CCDHMFVDXDKMKIQVSWJAJJHWYCAO4M6HFFSLKSSIJ6DQVH56J2GRS7UC';

/**
 * XLM token info
 */
export const XLM_ADDRESS: string = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
export const XLM_DECIMALS: number = 7;

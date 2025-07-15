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

export const NORMAL_BASE_FEE = '100000';

/**
 * Normal History Indexer
 */
export const NORMAL_HISTORY_INDEXER: string = 'https://graphql.normalfinance.io';

export const XLM_ADDRESS: string = 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA';

export const XLM_DECIMALS: number = 7;

export const xlmTokenList = [
  {
    network: 'mainnet',
    assets: [
      {
        contract: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
        name: 'StellarLumens',
        code: 'XLM',
        icon: 'https://assets.coingecko.com/coins/images/100/standard/Stellar_symbol_black_RGB.png',
        decimals: 7,
      },
    ],
  },
  {
    network: 'testnet',
    assets: [
      {
        contract: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        name: 'StellarLumens',
        code: 'XLM',
        icon: 'https://assets.coingecko.com/coins/images/100/standard/Stellar_symbol_black_RGB.png',
        decimals: 7,
      },
    ],
  },
  {
    network: 'standalone',
    assets: [
      {
        contract: 'CDMLFMKMMD7MWZP3FKUBZPVHTUEDLSX4BYGYKH4GCESXYHS3IHQ4EIG4',
        name: 'StellarLumens',
        code: 'XLM',
        icon: 'https://assets.coingecko.com/coins/images/100/standard/Stellar_symbol_black_RGB.png',
        decimals: 7,
      },
    ],
  },
  {
    network: 'futurenet',
    assets: [
      {
        contract: 'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT',
        name: 'StellarLumens',
        code: 'XLM',
        icon: 'https://assets.coingecko.com/coins/images/100/standard/Stellar_symbol_black_RGB.png',
        decimals: 7,
      },
    ],
  },
];

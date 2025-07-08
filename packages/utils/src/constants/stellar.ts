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
  'CCXBQN3K64UDQZL7YCAS7CFCJP3UQH6BJNNRH26PX5WI5JKKHFF5UBSZ';

/**
 * Pool Swap Fee contract address
 */
export const POOL_SWAP_FEE_ADDRESS: string =
  'CB4SVAWJA6TSRNOJZ7W2AWFW46D5VR4ZMFZKDIKXEINZCZEGZCJZCKMI';

/**
 * Buffer contract address
 */
export const BUFFER_ADDRESS: string = 'CC4DYENCBXR3VY4I65CLTBIKIF34PZRQOHB4UAK75MIXLCGQSJH2XVRQ';

/**
 * Insurance Fund contract address
 */
export const INSURANCE_FUND_ADDRESS: string =
  'CBERZDY7CRA224JTDHMOUK4DAVL4JAWJSVZN7VZAQTTIZEKF3TEG3UHA';

/**
 * Oracle Registry contract address
 */
export const ORALCE_REGISTY_ADDRESS: string =
  'CDOWZMNCWE4OSSFMVT53M3IDXSFTWFR6NY6C4XFNO3BLXLDQYS4XV4JO';

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

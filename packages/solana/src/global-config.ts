import packageJson from '../package.json';

import type { Token } from './types/token';
import type { SwapFeeInfo } from './types/swap-fee-info';

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  serverUrl: string;
  assetsDir: string;
  isStaticExport: boolean;
  privy: {
    appId: string;
    secret: string;
  };
  poap_url: string;
  tokenList: Token[];
  swapFeeInfo: SwapFeeInfo;
};

// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  appName: 'Normal',
  appVersion: packageJson.version,
  serverUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? '',
  assetsDir: process.env.NEXT_PUBLIC_ASSETS_DIR ?? '',
  isStaticExport: JSON.parse(`${process.env.BUILD_STATIC_EXPORT}`),
  privy: {
    appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '',
    secret: process.env.PRIVY_APP_SECRET ?? '',
  },
  poap_url: process.env.NEXT_PUBLIC_NORMAL_POAP_URL ?? '',
  tokenList: [
    {
      id: 0,
      logo: `${process.env.NEXT_PUBLIC_ASSETS_DIR ?? ''}/assets/icons/logos/SOL.svg`,
      url: 'https://cryptologos.cc/logos/solana-sol-logo.png?v=040',
      name: 'Solana',
      shortname: 'SOL',
      owned: true,
      countstatus: 2.02106,
      pricestatus: 134.11,
      featured: false,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
    {
      id: 1,
      logo: `${process.env.NEXT_PUBLIC_ASSETS_DIR ?? ''}/assets/icons/logos/XLM.svg`,
      url: 'https://cryptologos.cc/logos/stellar-xlm-logo.png?v=040',
      name: 'Stellar',
      shortname: 'XLM',
      owned: true,
      countstatus: 1252.94,
      pricestatus: 0.27,
      featured: false,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
    {
      id: 2,
      logo: `${process.env.NEXT_PUBLIC_ASSETS_DIR ?? ''}/assets/icons/logos/nBTC.png`,
      url: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=040',
      name: 'Normal Bitcoin',
      shortname: 'nBTC',
      owned: false,
      countstatus: 0,
      pricestatus: 86204.89,
      featured: true,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
    {
      id: 3,
      logo: `${process.env.NEXT_PUBLIC_ASSETS_DIR ?? ''}/assets/icons/logos/nETH.png`,
      url: 'https://token-icons.s3.amazonaws.com/eth.png',
      name: 'Normal Ethereum',
      shortname: 'nETH',
      owned: true,
      countstatus: 0.02106,
      pricestatus: 2372.25,
      featured: true,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
    {
      id: 4,
      logo: `${process.env.NEXT_PUBLIC_ASSETS_DIR ?? ''}/assets/icons/logos/nXRP.png`,
      url: 'https://cryptologos.cc/logos/xrp-xrp-logo.png?v=040',
      name: 'Normal Ripple',
      shortname: 'nXRP',
      owned: false,
      countstatus: 0,
      pricestatus: 2.21,
      featured: false,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
    {
      id: 5,
      logo: `${process.env.NEXT_PUBLIC_ASSETS_DIR ?? ''}/assets/icons/logos/nSUI.png`,
      url: 'https://cryptologos.cc/logos/sui-sui-logo.png?v=040',
      name: 'Normal Sui',
      shortname: 'nSUI',
      owned: false,
      countstatus: 0,
      pricestatus: 2.86,
      featured: true,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
    {
      id: 6,
      logo: `${process.env.NEXT_PUBLIC_ASSETS_DIR ?? ''}/assets/icons/logos/nDOGE.png`,
      url: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png?v=040',
      name: 'Normal DogeCoin',
      shortname: 'nDOGE',
      owned: false,
      countstatus: 0,
      pricestatus: 0.2021,
      featured: false,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
    {
      id: 7,
      logo: `${process.env.NEXT_PUBLIC_ASSETS_DIR ?? ''}/assets/icons/logos/USDC.svg`,
      url: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
      name: 'USDC',
      shortname: 'USDC',
      owned: false,
      countstatus: 0,
      pricestatus: 0.9998,
      featured: false,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
    {
      id: 9,
      url: 'https://app.normalfinance.io/assets/icons/indexes/normal_crypto_index.png',
      name: 'Normal Crypto Index',
      shortname: 'nIDX',
      owned: true,
      countstatus: 12.52,
      pricestatus: 115.89,
      featured: true,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
    {
      id: 8,
      url: 'https://app.normalfinance.io/assets/icons/indexes/normal_ai_data_index.png',
      name: 'Normal AI Index',
      shortname: 'nAI',
      owned: false,
      countstatus: 0,
      pricestatus: 52.62,
      featured: true,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
    {
      id: 9,
      url: 'https://app.normalfinance.io/assets/icons/indexes/normal_defi_index.png',
      name: 'Normal DeFi Index',
      shortname: 'nDEFI',
      owned: false,
      countstatus: 0,
      pricestatus: 184.25,
      featured: false,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
    {
      id: 10,
      url: 'https://app.normalfinance.io/assets/icons/indexes/normal_meme_index.png',
      name: 'Normal Memecoin Index',
      shortname: 'nMEME',
      owned: false,
      countstatus: 0,
      pricestatus: 12.86,
      featured: false,
      address: 'GsD4XPiQtEMrkjtGZcNqK3R9pwDHxZ6ehmSb1sRsvjaX',
    },
  ],
  swapFeeInfo: {
    feePercentage: 0.25,
    networkCost: 1.0,
    priceImpact: -0.3,
    maxSlippage: 0.5,
  },
};

import packageJson from '../package.json';

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  siteUrl: string;
  isStaticExport: boolean;
  crisp: {
    websiteId: string;
    secretKey: string;
  };
  coinbase: {
    projectId: string;
  };
  onramper: {
    apiKey: string;
  };
};

// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  appName: 'Normal',
  appVersion: packageJson.version,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://app.normalfinance.io',
  isStaticExport: JSON.parse(process.env.BUILD_STATIC_EXPORT || 'false'),
  crisp: {
    websiteId: process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ?? '',
    secretKey: process.env.CRISP_SECRET_KEY ?? '',
  },
  coinbase: {
    projectId: process.env.NEXT_PUBLIC_COINBASE_PROJECT_ID ?? '',
  },
  onramper: {
    apiKey: process.env.NEXT_PUBLIC_ONRAMPER_API_KEY ?? '',
  },
};

export const ZEALY_QUEST_IDS = {
  createWallet: 'a1a2089b-479b-49d1-a9bf-203aec1b40f1',
  connectWallet: '4c7515c1-fd79-4188-9bcb-c84591888f31',
  receiveFaucet: '49098c76-25aa-4278-ba9e-c409a0b8a1c5',
  swap: '61eb5ca9-62ec-459b-8f62-9225aabf0e70',
  addLiquidity: '513e79f5-5256-486a-81d2-866e001042ce',
  stakeFund: '12963fdf-ba29-4b10-9a67-0dc8c91386f9',
  createIndex: '9e81a3f3-a29f-4ede-a374-375ac66be672',
  mintIndex: '88320ff0-7b6f-4745-b64b-bce85889f6da',
  giveFeedback: 'adb21c28-fc92-46a5-b160-900c4bd7efe7',
} as const;

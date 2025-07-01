import packageJson from '../package.json';

// ----------------------------------------------------------------------

export type ConfigValue = {
  deployment: 'SOLANA' | 'STELLAR';
  appName: string;
  appVersion: string;
  serverUrl: string;
  assetsDir: string;
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
  deployment: 'STELLAR',
  appName: 'Normal',
  appVersion: packageJson.version,
  serverUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? '',
  assetsDir: process.env.NEXT_PUBLIC_ASSETS_DIR ?? '',
  isStaticExport: JSON.parse(`${process.env.BUILD_STATIC_EXPORT}`),
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

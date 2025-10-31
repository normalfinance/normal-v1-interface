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
  onramper: {
    apiKey: string;
  };
};

// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  appName: 'Normal',
  appVersion: packageJson.version,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.normalfinance.io',
  isStaticExport: JSON.parse(process.env.BUILD_STATIC_EXPORT || 'false'),
  crisp: {
    websiteId: process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ?? '',
    secretKey: process.env.CRISP_SECRET_KEY ?? '',
  },
  onramper: {
    apiKey: process.env.NEXT_PUBLIC_ONRAMPER_API_KEY ?? '',
  },
};

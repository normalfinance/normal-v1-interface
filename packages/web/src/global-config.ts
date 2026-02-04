import packageJson from '../package.json';

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  siteUrl: string;
  isStaticExport: boolean;
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
  onramper: {
    apiKey: process.env.NEXT_PUBLIC_ONRAMPER_API_KEY ?? '',
  },
};

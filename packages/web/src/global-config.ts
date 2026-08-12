import packageJson from '../package.json';

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  siteUrl: string;
  isStaticExport: boolean;
};

// ----------------------------------------------------------------------

// #31 (removed 2026-08-12): the Onramper config + NEXT_PUBLIC_ONRAMPER_API_KEY
// served a service that was commented out long ago. An unused key shipped to
// every browser is pure liability — delete the env var from Vercel too.
export const CONFIG: ConfigValue = {
  appName: 'Normal',
  appVersion: packageJson.version,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.normalfinance.io',
  isStaticExport: JSON.parse(process.env.BUILD_STATIC_EXPORT || 'false'),
};

import packageJson from '../package.json';

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  serverUrl: string;
  assetsDir: string;
  isStaticExport: boolean;
  analytics: {
    enabled: boolean;
  };
  crisp: {
    websiteId: string;
    secretKey: string;
  };
  customerio: {
    siteId: string;
    apiKey: string;
    appApiKey: string;
  };
};

// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  appName: 'Normal',
  appVersion: packageJson.version,
  serverUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? '',
  assetsDir: process.env.NEXT_PUBLIC_ASSETS_DIR ?? '',
  isStaticExport: JSON.parse(`${process.env.BUILD_STATIC_EXPORT}`),
  analytics: {
    enabled: Boolean(process.env.ANALYTICS_ENABLED) ?? false,
  },
  crisp: {
    websiteId: process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ?? '',
    secretKey: process.env.CRISP_SECRET_KEY ?? '',
  },
  customerio: {
    siteId: process.env.CUSTOMER_IO_SITE_ID ?? '',
    apiKey: process.env.CUSTOMER_IO_API_KEY ?? '',
    appApiKey: process.env.CUSTOMER_IO_APP_API_KEY ?? '',
  },
};

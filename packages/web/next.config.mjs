import { withPostHogConfig } from '@posthog/nextjs-config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = readFileSync(path.join(__dirname, 'package.json'), 'utf-8');
const { version } = JSON.parse(packageJson);

/** @type {import('next').NextConfig} */

const isStaticExport = 'false';

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.normalapi.com',
        port: '',
        pathname: '/**',
        search: '',
      },
    ],
  },
  trailingSlash: true,
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  env: {
    BUILD_STATIC_EXPORT: isStaticExport,
    NEXT_PUBLIC_APP_VERSION: version,
  },
  modularizeImports: {
    '@mui/icons-material': { transform: '@mui/icons-material/{{member}}' },
    '@mui/material': { transform: '@mui/material/{{member}}' },
    '@mui/lab': { transform: '@mui/lab/{{member}}' },
  },
  experimental: {
    // reactCompiler: true, // <-- remove/gate this on Next 14
    turbo: {
      resolveAlias: {
        '@normalfinance/types': '../types/src',
        '@normalfinance/utils': '../utils/src',
        '@normalfinance/contracts': '../contracts/src',
        '@normalfinance/state': '../state/src',
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    // Do NOT override devtool in dev (avoids Next warning/perf hit)
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/ph/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      { source: '/ph/:path*', destination: 'https://us.i.posthog.com/:path*' },
      { source: '/ph/decide', destination: 'https://us.i.posthog.com/decide' },
      // Rewrite API routes with trailing slash to without trailing slash to prevent redirects
      // {
      //   source: '/api/:path*/',
      //   destination: '/api/:path*',
      // },
    ];
  },
  ...(isStaticExport === 'true' && { output: 'export' }),
};

// ---- PostHog guard --------------------------------------------------
const isProd = process.env.NODE_ENV === 'production';
const network = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() || 'testnet';

const getPostHogConfig = () => {
  const isMainnet = network === 'mainnet';

  return {
    projectName: isMainnet
      ? process.env.NEXT_PUBLIC_MAINNET_POSTHOG_PROJECT_NAME
      : process.env.NEXT_PUBLIC_TESTNET_POSTHOG_PROJECT_NAME,
    key: isMainnet
      ? process.env.NEXT_PUBLIC_MAINNET_POSTHOG_KEY
      : process.env.NEXT_PUBLIC_TESTNET_POSTHOG_KEY,
    host: isMainnet
      ? process.env.NEXT_PUBLIC_MAINNET_POSTHOG_HOST
      : process.env.NEXT_PUBLIC_TESTNET_POSTHOG_HOST,
    envId: isMainnet ? process.env.POSTHOG_MAINNET_ENV_ID : process.env.POSTHOG_TESTNET_ENV_ID,
    apiKey: isMainnet ? process.env.POSTHOG_MAINNET_API_KEY : process.env.POSTHOG_TESTNET_API_KEY,
  };
};

const posthogConfig = getPostHogConfig();
const hasPHKeys = !!posthogConfig.apiKey && !!posthogConfig.envId && !!posthogConfig.host;

const getPostHogProjectName = () => {
  const branch = process.env.VERCEL_GIT_BRANCH;

  if (branch === 'develop') {
    return 'Normal_Development';
  }

  return posthogConfig.projectName || (network === 'mainnet' ? 'Normal_Mainnet' : 'Normal_Testnet');
};

const posthogOptions = {
  personalApiKey: posthogConfig.apiKey,
  envId: posthogConfig.envId,
  host: posthogConfig.host,
  sourcemaps: {
    // Only upload on production builds, and only when keys are present
    enabled: isProd && hasPHKeys,
    project: getPostHogProjectName(),
    version,
    deleteAfterUpload: true,
  },
};

// Export plain config in dev (or when keys missing); wrap only in prod with keys.
export default isProd && hasPHKeys ? withPostHogConfig(nextConfig, posthogOptions) : nextConfig;

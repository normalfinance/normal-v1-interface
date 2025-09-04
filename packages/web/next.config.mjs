import { withPostHogConfig } from '@posthog/nextjs-config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = readFileSync(path.join(__dirname, 'package.json'), 'utf-8');
const { version } = JSON.parse(packageJson);

/**
 * @type {import('next').NextConfig}
 */

const isStaticExport = 'false';

const nextConfig = {
  trailingSlash: true,
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  env: {
    BUILD_STATIC_EXPORT: isStaticExport,
    NEXT_PUBLIC_APP_VERSION: version,
  },
  modularizeImports: {
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/lab': {
      transform: '@mui/lab/{{member}}',
    },
  },
  experimental: {
    reactCompiler: true,
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

    return config;
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/stellar.toml',
        destination: '/api/stellar',
      },
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },
  ...(isStaticExport === 'true' && {
    output: 'export',
  }),
};

export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_API_KEY,
  envId: process.env.POSTHOG_ENV_ID,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST, // (optional), defaults to https://us.posthog.com
  sourcemaps: {
    enabled: process.env.VERCEL_GIT_BRANCH !== 'develop', // (optional) Enable sourcemaps generation and upload, default to true on production builds
    project: `Normal - ${process.env.VERCEL_GIT_BRANCH === 'develop' ? 'development' : 'Testnet'}`, // (optional) Project name, defaults to repository name
    version: version, // (optional) Release version, defaults to current git commit
    deleteAfterUpload: true, // (optional) Delete sourcemaps after upload, defaults to true
  },
});

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
      { source: '/.well-known/stellar.toml', destination: '/api/stellar' },
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
      { source: '/ingest/decide', destination: 'https://us.i.posthog.com/decide' },
    ];
  },
  ...(isStaticExport === 'true' && { output: 'export' }),
};

// ---- PostHog guard --------------------------------------------------
const isProd = process.env.NODE_ENV === 'production';
const hasPHKeys =
  !!process.env.POSTHOG_API_KEY && // personal API key for uploads
  !!process.env.POSTHOG_ENV_ID && // env id (project env)
  !!process.env.NEXT_PUBLIC_POSTHOG_HOST; // host (or default to US if you prefer)

//mock for now
  const getPostHogProjectName = () => {
  const network = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() || 'testnet';
  const branch = process.env.VERCEL_GIT_BRANCH;

  if (branch === 'develop') {
    return 'Normal - Development';
  }

  return network === 'mainnet' ? 'Normal - Mainnet' : 'Normal - Testnet';
};

const posthogOptions = {
  personalApiKey: process.env.POSTHOG_API_KEY,
  envId: process.env.POSTHOG_ENV_ID,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST, // defaults to https://us.posthog.com if omitted
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

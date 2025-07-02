/**
 * @type {import('next').NextConfig}
 */

import pkg from './package.json' assert { type: 'json' };

const isStaticExport = 'false';
const appVersion = pkg.version;

const nextConfig = {
  trailingSlash: true,
  env: {
    BUILD_STATIC_EXPORT: isStaticExport,
    NEXT_PUBLIC_APP_VERSION: appVersion,
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
    ];
  },
  ...(isStaticExport === 'true' && {
    output: 'export',
  }),
};

export default nextConfig;

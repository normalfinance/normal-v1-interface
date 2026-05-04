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
  async redirects() {
    return [
      {
        source: '/invest',
        destination: '/swap',
        permanent: true,
      },
      {
        source: '/earn',
        destination: '/savings',
        permanent: true,
      },
      {
        source: '/indexes/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'normalfinance.io',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  ...(isStaticExport === 'true' && { output: 'export' }),
};

export default nextConfig;

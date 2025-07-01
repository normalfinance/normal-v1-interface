'use client';

;
import type {
  PoolDetails,
  ExplorerChartData,
} from '@/components/_common/pools-explore/explorer-chart-data';

import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@normalfinance/state';
import { DashboardContent } from '@/layouts/dashboard';
import { fCurrencyCompact } from '@/utils/format-number';
import { createChartData } from '@/utils/portfolio-value-chart-series';

import Grid2 from '@mui/material/Grid2';
// import Grid2 from '@mui/material/Grid2';
import { Stack, useTheme, Typography } from '@mui/material';

import ExploreStats from '@/components/_common/explore-stats/explore-stats';
import { PoolsExplorer } from '@/components/_common/pools-explore/pools-explore';
import {
  ExploreTokensTable,
} from '@/components/_common/explore-tokens-table/explore-tokens-table';

// Price data samples
const priceData24h = Array.from({ length: 24 }, (_, i) => 1000 + i * 5);
const priceData7d = Array.from({ length: 7 }, (_, i) => 1100 + i * 20);
const priceData30d = Array.from({ length: 31 }, (_, i) => 1050 + i * 10);
const priceData12m = Array.from({ length: 12 }, (_, i) => 950 + i * 50);

// Volume data samples
const volumeData24h = Array.from({ length: 24 }, (_, i) => 5000 + i * 100);
const volumeData7d = Array.from({ length: 7 }, (_, i) => 10000 + i * 200);
const volumeData30d = Array.from({ length: 31 }, (_, i) => 15000 + i * 150);
const volumeData12m = Array.from({ length: 12 }, (_, i) => 20000 + i * 500);

// Liquidity data samples
const liquidityData24h = Array.from({ length: 24 }, (_, i) => 75000 + i * 300);
const liquidityData7d = Array.from({ length: 7 }, (_, i) => 80000 + i * 600);
const liquidityData30d = Array.from({ length: 31 }, (_, i) => 85000 + i * 400);
const liquidityData12m = Array.from({ length: 12 }, (_, i) => 90000 + i * 1000);

const poolChartData: ExplorerChartData = {
  price: {
    '24h': createChartData('24h', priceData24h, 8),
    '7d': createChartData('7d', priceData7d, 7),
    '30d': createChartData('30d', priceData30d, 8),
    '12m': createChartData('12m', priceData12m, 12),
  },
  volume: {
    '24h': createChartData('24h', volumeData24h, 8),
    '7d': createChartData('7d', volumeData7d, 7),
    '30d': createChartData('30d', volumeData30d, 8),
    '12m': createChartData('12m', volumeData12m, 12),
  },
  liquidity: {
    '24h': createChartData('24h', liquidityData24h, 8),
    '7d': createChartData('7d', liquidityData7d, 7),
    '30d': createChartData('30d', liquidityData30d, 8),
    '12m': createChartData('12m', liquidityData12m, 12),
  },
};

const poolsExplorerData: PoolDetails = {
  pairInfo: {
    tokenA: {
      name: 'USDC',
      iconUrl: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
    },
    tokenB: { name: 'ETH', iconUrl: 'https://token-icons.s3.amazonaws.com/eth.png' },
    address: '0x88e6...5640',
  },
  metadata: {
    version: 'v3',
    feeTier: '0.05%',
  },
  exchangeRate: {
    label: '1 WETH = 2,304.28 USDC',
    usdEquivalent: '$2,289.11',
    tokenSymbol: 'WETH',
    tokenRate: '2,304.28 USDC',
    tokenUSDValue: '$2,289.11',
  },
  performance: {
    percentageChange: 1.23,
  },
};

const stats = [
  { title: '1D Volume', total: 1212123, percent: 100 },
  { title: 'Total TVL', total: 534123, percent: 47 },
  { title: 'Total Markets', total: 321231, percent: -26 },
  { title: 'Total Indexes', total: 821318, percent: 7 },
  { title: 'Total Index TVL', total: 261239, percent: 22 },
];

const allMarkets = [
  {
    id: '1',
    name: 'BTC-SOL',
    price: 1531.34325346456,
    percentageChange: 4.5,
    performance: 'CEO',
    status: 'trending',
    avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg',
    url: '/markets/btc-sol',
  },
  {
    id: '2',
    name: 'ETH-SOL',
    price: 531.32,
    percentageChange: 2.5,
    performance: 'CEO',
    status: 'meme',
    avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Ethereum-icon-purple.svg',
    url: '/markets/btc-sol',
  },
  {
    id: '3',
    name: 'XRP-SOL',
    price: 731.32,
    percentageChange: -2.5,
    performance: 'CEO',
    status: 'rwa',
    avatarUrl: 'https://cryptologos.cc/logos/xrp-xrp-logo.svg?v=040',
    url: '/markets/btc-sol',
  },
];

export default function ExploreView() {
  const theme = useTheme();
  const { t } = useTranslate();
  const store = useAppStore(); // Global state management
  const router = useRouter(); // Next.js router

  const tokens = [
    {
      id: '1',
      rank: 1,
      name: 'USD Coin',
      symbol: 'USDC',
      iconUrl: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png',
      price: 1,
      change1h: 0.02,
      change1d: 0.11,
      fdv: 61700000000,
      volume24h: 2340000000,
      spark: {
        colors: [theme.palette.success.main],
        categories: Array.from({ length: 24 }, (_, i) => `${i}`),
        series: Array.from({ length: 24 }, () => 0.99 + Math.random() * 0.02),
      },
      url: '/pools/usdc',
    },
    {
      id: '2',
      rank: 2,
      name: 'Ethereum',
      symbol: 'ETH',
      iconUrl: 'https://token-icons.s3.amazonaws.com/eth.png',
      price: 2814.25,
      change1h: -0.4,
      change1d: 2.3,
      fdv: 337000000000,
      volume24h: 15400000000,
      spark: {
        colors: [theme.palette.warning.main],
        categories: Array.from({ length: 24 }, (_, i) => `${i}`),
        series: Array.from({ length: 24 }, () => 2700 + Math.random() * 150),
      },
      url: '/pools/eth',
    },
  ];

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">{t('Explore')}</Typography>
      </Stack>
      <Grid2 width={1} sx={{ mt: 3 }}>
        <ExploreStats stats={stats} />
      </Grid2>
      <Grid2 sx={{ mt: 3 }}>
        <ExploreTokensTable markets={tokens} />
      </Grid2>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <PoolsExplorer
          id="portfolio_value"
          pairInfo={poolsExplorerData.pairInfo}
          metadata={poolsExplorerData.metadata}
          exchangeRate={poolsExplorerData.exchangeRate}
          performance={poolsExplorerData.performance} 
          legendValues={[{ title: 'Price', number: 7334, formatter: fCurrencyCompact }]}
          chart={poolChartData}
          color={theme.palette.primary.main}
        />
      </Grid2>
    </DashboardContent>
  );
}

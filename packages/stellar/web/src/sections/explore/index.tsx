'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/state/store';
import { DashboardContent } from '@/layouts/dashboard';
import { PoolsExplorer } from '@/components/_common/pools-explore/pools-explore';

import Grid2 from '@mui/material/Grid2';
import { useTheme } from '@mui/material';
// import Grid2 from '@mui/material/Grid2';
import { Stack, Typography } from '@mui/material';
import {
  ExplorerChartData,
  PoolDetails,
} from '@/components/_common/pools-explore/explorer-chart-data';
import { createChartData } from '@/utils/portfolio-value-chart-series';
import { fCurrencyCompact } from '@/utils/format-number';

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

export default function ExploreView() {
  const theme = useTheme();
  const store = useAppStore(); // Global state management
  const router = useRouter(); // Next.js router

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          Explore
        </Typography>
      </Stack>
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

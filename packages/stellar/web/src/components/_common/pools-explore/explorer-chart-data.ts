import { RealtimeChartData } from '@/utils/portfolio-value-chart-series';

export type ChartMetricKey = 'price' | 'volume' | 'liquidity';
export type ChartTimeframeKey = '24h' | '7d' | '30d' | '12m';

export type ExplorerChartData = {
  [metric in ChartMetricKey]?: {
    [timeframe in ChartTimeframeKey]?: RealtimeChartData;
  };
};

export type PoolDetails = {
  pairInfo: {
    tokenA: { name: string; iconUrl: string };
    tokenB: { name: string; iconUrl: string };
    address: string;
  };
  metadata: {
    version: string;
    feeTier: string;
  };
  exchangeRate: {
    label: string;
    usdEquivalent: string;
    tokenSymbol: string;
    tokenRate: string;
    tokenUSDValue: string;
  };
  performance: {
    percentageChange: number;
  };
};

export type TokenPairInfo = {
  tokenA: { name: string; iconUrl: string };
  tokenB: { name: string; iconUrl: string };
  address: string;
};

export type PoolMetadata = {
  version: string; // e.g., 'v3'
  feeTier: string; // e.g., '0.05%'
};

export type ExchangeRateInfo = {
  label: string; // e.g., '1 WETH = 2,304.28 USDC'
  usdEquivalent: string; // e.g., '$2,289.11'
  tokenSymbol: string; // e.g., 'WETH'
  tokenRate: string; // e.g., '2,304.28 USDC'
  tokenUSDValue: string; // e.g., '$2,289.11'
};

export type PerformanceInfo = {
  percentageChange: number;
};

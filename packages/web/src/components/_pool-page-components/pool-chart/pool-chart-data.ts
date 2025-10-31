import type { Token } from '@normalfinance/types';
import type { RealtimeChartData } from '@/utils/portfolio-value-chart-series';

export type ChartMetricKey = 'price' | 'volume' | 'liquidity';
export type ChartTimeframeKey = '24h' | '7d' | '30d' | '12m';

export type ExplorerChartData = {
  [metric in ChartMetricKey]?: {
    [timeframe in ChartTimeframeKey]?: RealtimeChartData;
  };
};

export type PoolDetails = {
  poolInfo: TokenPairInfo;
  metadata: PoolMetadata;
  exchangeRate?: ExchangeRateInfo;
  performance: {
    percentageChange?: number;
    position?: number;
    fees?: number;
  };
};

export type TokenPairInfo = {
  tokenA: Token;
  tokenB: Token;
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
  percentageChange?: number;
};

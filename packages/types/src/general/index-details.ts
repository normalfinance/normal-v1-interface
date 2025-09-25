import type { Token } from './token';

export type WeightingStrategyType = 'MARKET_CAP' | 'EQUAL' | 'CUSTOM';

export interface IndexEvent {
  type: 'CREATION' | 'ADD' | 'REMOVE' | 'REBALANCE';
  assetName?: string;
  assetShortname?: string;
  percent?: number;
  timestamp: string;
}

export interface WeightingStrategy {
  type: WeightingStrategyType;
  label: string;
  description: string;
}

export interface WeightedToken extends Token {
  weightPct: number;
}

export interface IndexDetails {
  id: number;
  name: string;
  slug: string;
  priceUsd: number;
  priceChangePct24h: number;
  tvlUsd: number;
  tvlChangePct24h: number;
  coinCount: number;
  coinCountChangePct24h: number;
  description?: string;
  creationDate: string;
  updatedAt: string;
  methodologyUrl?: string;
  weighting: WeightingStrategy;
  constituents: WeightedToken[];
  events?: IndexEvent[];
}

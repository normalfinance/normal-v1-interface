import type {
  IndexDetails as DomainIndexDetails,
  WeightingStrategy as DomainWeightingStrategy,
} from '@normalfinance/types';

export type IndexCoin = {
  id: number;
  url: string;
  name: string;
  shortName: string;
  price: number;
  marketCap: number;
  indexPercentage?: number;
};

export type IIndexItem = {
  indexName: string;
  indexSymbol: string;
  indexDescription: string;
  weightingMethod: 'Constant' | 'Custom' | 'Market Cap';
  initialPrice: number;
  initialDeposit: number;
  isPublic: boolean;
  avatarUrl: File | string | null; // allow string for prefill
  indexCoinList: IndexCoin[];
};

// ----- Existing Domain/Display Types -----
export type WeightingStrategyType = 'MARKET_CAP' | 'EQUAL' | 'CUSTOM';

export interface IndexEvent {
  type: 'CREATION' | 'ADD' | 'REMOVE' | 'REBALANCE';
  assetName?: string;
  assetShortname?: string;
  percent?: number;
  timestamp: string;
}

// If your real Token has more fields, extend here as needed.
export interface Token {
  id?: number;
  name: string;
  shortName: string;
  imageUrl?: string;
  priceUsd?: number;
  marketCapUsd?: number;
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
  // optional extras your domain might carry:
  avatar?: string;
}

export enum WeightingKind {
  EQUAL = 'EQUAL',
  CUSTOM = 'CUSTOM',
  MARKET_CAP = 'MARKET_CAP',
}

const domainToFormWeighting: Record<WeightingKind, IIndexItem['weightingMethod']> = {
  [WeightingKind.EQUAL]: 'Constant',
  [WeightingKind.CUSTOM]: 'Custom',
  [WeightingKind.MARKET_CAP]: 'Market Cap',
};

// 1) Form -> Domain
export function formToIndexDetails(
  form: IIndexItem,
  opts?: {
    id?: number;
    slug?: string;
    creationDate?: string;
    updatedAt?: string;
    priceChangePct24h?: number;
    tvlUsd?: number;
    tvlChangePct24h?: number;
    coinCountChangePct24h?: number;
    methodologyUrl?: string;
    events?: IndexEvent[];
  }
): IndexDetails {
  const weightingType =
    form.weightingMethod === 'Constant'
      ? WeightingKind.EQUAL
      : form.weightingMethod === 'Market Cap'
        ? WeightingKind.MARKET_CAP
        : WeightingKind.CUSTOM;

  const constituents = form.indexCoinList.map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    imageUrl: c.url,
    priceUsd: c.price,
    marketCapUsd: c.marketCap,
    weightPct: c.indexPercentage ?? 0,
  }));

  return {
    id: opts?.id ?? 0,
    name: form.indexName,
    slug: opts?.slug ?? toSlug(form.indexName),
    priceUsd: form.initialPrice,
    priceChangePct24h: opts?.priceChangePct24h ?? 0,
    tvlUsd: opts?.tvlUsd ?? 0,
    tvlChangePct24h: opts?.tvlChangePct24h ?? 0,
    coinCount: constituents.length,
    coinCountChangePct24h: opts?.coinCountChangePct24h ?? 0,
    description: form.indexDescription || undefined,
    creationDate: opts?.creationDate ?? new Date().toISOString(),
    updatedAt: opts?.updatedAt ?? new Date().toISOString(),
    methodologyUrl: opts?.methodologyUrl,
    weighting: {
      type: weightingType,
      label:
        weightingType === WeightingKind.EQUAL
          ? 'Equal Weight'
          : weightingType === WeightingKind.MARKET_CAP
            ? 'Market Cap'
            : 'Custom',
      description:
        weightingType === WeightingKind.EQUAL
          ? 'Every asset has the same weight (1/n).'
          : weightingType === WeightingKind.MARKET_CAP
            ? 'Weights proportional to each asset’s market cap.'
            : 'Weights are set manually and must total 100%.',
    },
    constituents,
    events: opts?.events ?? [],
  };
}

// 2) Domain -> Form (accept both local and domain IndexDetails shapes)
export function indexDetailsToForm(details: IndexDetails | DomainIndexDetails): IIndexItem {
  const rawType = (details as any).weighting?.type as string;

  const weightingMethod =
    rawType === 'EQUAL'
      ? 'Constant'
      : rawType === 'MARKET_CAP'
        ? 'Market Cap'
        : rawType === 'CUSTOM'
          ? 'Custom'
          : (domainToFormWeighting[rawType as WeightingKind] ?? 'Custom');

  const indexCoinList: IndexCoin[] =
    (details as any).constituents?.map((c: any) => ({
      id: c.id ?? 0,
      url: c.imageUrl ?? c.icon ?? '',
      name: c.name,
      shortName: c.shortName ?? c.shortname ?? '',
      price: c.priceUsd ?? 0,
      marketCap: c.marketCapUsd ?? 0,
      indexPercentage: c.weightPct ?? 0,
    })) ?? [];

  const slug = (details as any).slug ?? toSlug((details as any).name ?? '');

  return {
    indexName: (details as any).name ?? '',
    indexSymbol: firstNonEmpty(
      slug.toUpperCase().slice(0, 6), // ⬅️ ensure at most 6 chars
      ((details as any).name ?? '').slice(0, 6).toUpperCase()
    ),
    indexDescription: (details as any).description ?? '',
    weightingMethod,
    initialPrice: (details as any).priceUsd ?? 1,
    initialDeposit: 0,
    isPublic: true,
    avatarUrl: (details as any).avatar ?? null, // keep as string; form converts to File for preview
    indexCoinList,
  };
}

// ----- Small helpers -----
function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function firstNonEmpty(...vals: Array<string | undefined>): string {
  for (const v of vals) {
    if (v && v.trim()) return v;
  }
  return '';
}

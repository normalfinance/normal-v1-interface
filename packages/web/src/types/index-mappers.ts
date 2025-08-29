import type {
  IndexDetails as DomainIndexDetails,
  WeightedToken as DomainWeightedToken,
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
  avatarUrl: File | null;
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
}

// ----- Shared enum (optional, but nice) -----
export enum WeightingKind {
  EQUAL = 'EQUAL',
  CUSTOM = 'CUSTOM',
  MARKET_CAP = 'MARKET_CAP',
}

// Map between form wording and domain enum
const formToDomainWeighting: Record<IIndexItem['weightingMethod'], WeightingKind> = {
  Constant: WeightingKind.EQUAL,
  Custom: WeightingKind.CUSTOM,
  'Market Cap': WeightingKind.MARKET_CAP,
};

const domainToFormWeighting: Record<WeightingKind, IIndexItem['weightingMethod']> = {
  [WeightingKind.EQUAL]: 'Constant',
  [WeightingKind.CUSTOM]: 'Custom',
  [WeightingKind.MARKET_CAP]: 'Market Cap',
};

// Simple label/description generator (tweak or localize as needed)
function weightingMeta(kind: WeightingKind): Pick<WeightingStrategy, 'label' | 'description'> {
  switch (kind) {
    case WeightingKind.EQUAL:
      return {
        label: 'Equal Weight',
        description: 'Every asset has the same weight (1/n).',
      };
    case WeightingKind.CUSTOM:
      return {
        label: 'Custom',
        description: 'Weights are set manually and must total 100%.',
      };
    case WeightingKind.MARKET_CAP:
      return {
        label: 'Market Cap',
        description: 'Weights proportional to each asset’s market cap.',
      };
  }
}

// ----- Mappers -----
// 1) Form -> Domain
export function formToIndexDetails(
  form: IIndexItem,
  opts?: {
    // allow callers to pass system-generated values you don’t have in the form
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
  const kind = formToDomainWeighting[form.weightingMethod];
  const { label, description } = weightingMeta(kind);

  const constituents: WeightedToken[] = form.indexCoinList.map((c) => ({
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
      type: kind,
      label,
      description,
    },
    constituents,
    events: opts?.events ?? [],
  };
}

// 2) Domain -> Form
// Accept BOTH your local IndexDetails AND the domain IndexDetails from @normalfinance/types
export function indexDetailsToForm(details: IndexDetails | DomainIndexDetails): IIndexItem {
  // Normalize weighting type across both shapes
  const rawType =
    // your local type: details.weighting.type is WeightingKind
    (details as IndexDetails).weighting?.type ??
    // domain type (string union like 'EQUAL' | 'MARKET_CAP' | 'CUSTOM')
    (details as DomainIndexDetails).weighting?.type;

  // Reuse your existing enum mapping via an adapter
  const weightingMethod = (() => {
    switch (rawType) {
      case 'EQUAL':
        return 'Constant';
      case 'MARKET_CAP':
        return 'Market Cap';
      case 'CUSTOM':
        return 'Custom';
      default:
        // If rawType is already your WeightingKind enum value
        // map via domainToFormWeighting safely
        try {
          return domainToFormWeighting[rawType as WeightingKind];
        } catch {
          return 'Custom';
        }
    }
  })();

  // Normalize constituents across both shapes
  // - your local: uses shortName, imageUrl, priceUsd, marketCapUsd, weightPct
  // - domain: uses shortname, icon/imageUrl, priceUsd, marketCapUsd, weightPct
  const indexCoinList: IndexCoin[] = (details.constituents || []).map((c: any) => ({
    id: c.id ?? 0,
    url: c.imageUrl ?? c.icon ?? '',
    name: c.name,
    shortName: c.shortName ?? c.shortname ?? '',
    price: c.priceUsd ?? 0,
    marketCap: c.marketCapUsd ?? 0,
    indexPercentage: c.weightPct ?? 0,
  }));

  const slugUpper =
    (details as any).slug?.toUpperCase?.() ??
    (details as any).name?.slice?.(0, 6)?.toUpperCase?.() ??
    '';

  return {
    indexName: (details as any).name,
    indexSymbol: firstNonEmpty(slugUpper, (details as any).name?.slice?.(0, 6)?.toUpperCase?.()),
    indexDescription: (details as any).description ?? '',
    weightingMethod,
    initialPrice: (details as any).priceUsd,
    initialDeposit: 0, // not present in either domain, set as needed
    isPublic: true, // not present in either domain, set as needed
    avatarUrl: null, // no blob in domain
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

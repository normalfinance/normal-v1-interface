import type { IndexCoin, IIndexItem } from '@/types/indexes';
import type { IndexDetails as DomainIndexDetails } from '@normalfinance/types';

// If you prefer this enum elsewhere, feel free to move it into '@/types/indexes' and import.
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

// A minimal UI-side IndexDetails (not the domain one). If you don’t need this,
// you can remove it and just use the domain type where appropriate.
export interface UiWeightedToken {
  id?: number;
  name: string;
  shortName: string;
  imageUrl?: string;
  priceUsd?: number;
  marketCapUsd?: number;
  weightPct: number;
}

export interface UiWeightingStrategy {
  type: WeightingKind | string; // tolerate domain strings
  label: string;
  description: string;
}

export interface UiIndexDetails {
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
  weighting: UiWeightingStrategy;
  constituents: UiWeightedToken[];
  events?: any[];
  avatar?: string;
}

// ---- Form -> UI IndexDetails (helper, only if you need it) ----
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
    events?: any[];
  }
): UiIndexDetails {
  const weightingType: WeightingKind =
    form.weightingMethod === 'Constant'
      ? WeightingKind.EQUAL
      : form.weightingMethod === 'Market Cap'
        ? WeightingKind.MARKET_CAP
        : WeightingKind.CUSTOM;

  const constituents: UiWeightedToken[] = form.indexCoinList.map((c) => ({
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
    avatar: typeof form.avatarUrl === 'string' ? form.avatarUrl : undefined,
  };
}

// ---- Domain -> Form ----
// Accepts domain IndexDetails or any compatible shape; returns the canonical form type.
export function indexDetailsToForm(details: DomainIndexDetails | Record<string, any>): IIndexItem {
  const rawType = (details as any).weighting?.type as string;

  const weightingMethod: IIndexItem['weightingMethod'] =
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
      price: c.priceUsd ?? c.usdValue ?? 0,
      marketCap: c.marketCapUsd ?? c.marketCap ?? 0,
      indexPercentage: c.weightPct ?? 0,
    })) ?? [];

  const slug = (details as any).slug ?? toSlug((details as any).name ?? '');
  const symbol = (slug || (details as any).name || '').toString().toUpperCase().slice(0, 6);

  return {
    indexName: (details as any).name ?? '',
    indexSymbol: firstNonEmpty(symbol, ((details as any).name ?? '').slice(0, 6).toUpperCase()),
    indexDescription: (details as any).description ?? '',
    weightingMethod,
    initialPrice: (details as any).priceUsd ?? 1,
    initialDeposit: 0,
    isPublic: true,
    // string is allowed; the form will convert string -> File for preview
    avatarUrl: (details as any).avatar ?? null,
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

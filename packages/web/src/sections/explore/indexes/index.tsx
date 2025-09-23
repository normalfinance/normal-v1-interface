'use client';

import type { SingleStat } from '@/components/_explore-page-components';
import type { Token, IndexDetails, WeightedToken } from '@normalfinance/types';

import { useMemo } from 'react';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { fCurrency, fShortenNumber } from '@/utils/format-number';

import Grid2 from '@mui/material/Grid2';
import { Box, Stack, Typography } from '@mui/material';

import { IndexCard } from '@/components/_index-details/index-card';
import { ExploreIndexesTable } from '@/components/_index-details/explore-indexes-table';
import { IndexFundsInfoSection } from '@/components/_index-details/index-funds-info-section';

const makeToken = (
  id: number,
  name: string,
  short: string,
  logo: string,
  usdValue: number
): Token => ({
  id,
  name,
  shortname: short,
  icon: logo,
  url: `https://${name.toLowerCase()}.org`,
  owned: false,
  featured: true,
  countstatus: 0,
  pricestatus: 0,
  address: '',
  usdValue,
});

/* Base tokens (with usdValue as price) */
const BTC = makeToken(
  1,
  'Bitcoin',
  'BTC',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
  64000
);
const ETH = makeToken(
  2,
  'Ethereum',
  'ETH',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  3200
);
const SOL = makeToken(
  3,
  'Solana',
  'SOL',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
  150
);
const XRP = makeToken(
  4,
  'Ripple',
  'XRP',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png',
  0.55
);
const UNI = makeToken(
  5,
  'Uniswap',
  'UNI',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png',
  7.5
);
const AAVE = makeToken(
  6,
  'Aave',
  'AAVE',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/7278.png',
  95
);
const CRV = makeToken(
  7,
  'Curve DAO Token',
  'CRV',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/6538.png',
  0.42
);
const MKR = makeToken(
  8,
  'Maker',
  'MKR',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/1518.png',
  3100
);
const SNX = makeToken(
  9,
  'Synthetix',
  'SNX',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/2586.png',
  2.9
);
const GRT = makeToken(
  10,
  'The Graph',
  'GRT',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/6719.png',
  0.21
);
const FIL = makeToken(
  11,
  'Filecoin',
  'FIL',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/2280.png',
  4.8
);
const RNDR = makeToken(
  12,
  'Render',
  'RNDR',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/5690.png',
  6.2
);
const NEAR = makeToken(
  13,
  'NEAR Protocol',
  'NEAR',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/6535.png',
  4.1
);

/* Helpers */
const w = (tok: Token, weightPct: number): WeightedToken => ({ ...tok, weightPct });

// WeightedToken + runtime marketCapUsd (kept as extra prop for the form mapper)
const wCap = (tok: Token, weightPct: number, marketCapUsd: number): WeightedToken =>
  ({
    ...(tok as any),
    weightPct,
    marketCapUsd,
  }) as any;

export const INDEXES: IndexDetails[] = [
  {
    id: 1,
    avatar: '/assets/images/index/index-avatar-example.webp',
    name: 'Blue-Chip Top 10',
    slug: 'blue-chip-10',
    url: '/index/blue-chip-10',

    priceUsd: 125.37,
    priceChangePct24h: 1.12,
    tvlUsd: 38_540_000,
    tvlChangePct24h: -0.45,
    coinCount: 10,
    coinCountChangePct24h: 0,

    description: 'Tracks the ten largest L1 assets by market capitalisation.',
    creationDate: '2024-11-15T00:00:00Z',
    updatedAt: '2025-08-05T07:30:00Z',

    weighting: {
      type: 'CUSTOM',
      label: 'Custom Weighted',
      description: 'Weights each asset according to its circulating-market-cap share.',
    },

    constituents: [
      wCap(BTC, 48.0, 1_245_000_000_000),
      wCap(ETH, 25.5, 385_000_000_000),
      wCap(SOL, 15.0, 65_000_000_000),
      wCap(XRP, 11.5, 30_000_000_000),
    ],

    methodologyUrl: 'https://normal.finance/methodology/blue-chip-10',

    events: [
      { type: 'CREATION', assetName: 'Blue-Chip Top 10', timestamp: '2024-11-15T00:00:00Z' },
      { type: 'ADD', assetShortname: 'DOT', timestamp: '2025-01-10T12:00:00Z' },
      { type: 'REBALANCE', assetShortname: 'SOL', percent: 15, timestamp: '2025-03-05T09:30:00Z' },
      { type: 'REMOVE', assetShortname: 'XRP', timestamp: '2025-05-20T16:00:00Z' },
      { type: 'ADD', assetShortname: 'ADA', timestamp: '2025-06-18T08:15:00Z' },
      { type: 'REMOVE', assetShortname: 'DOT', timestamp: '2025-07-22T11:45:00Z' },
    ],

    createdByUser: true,
  },
  {
    id: 2,
    avatar: '/assets/images/index/index-avatar-defi.webp',
    name: 'DeFi Leaders 5',
    slug: 'defi',
    url: '/index/defi',

    priceUsd: 42.89,
    priceChangePct24h: -0.87,
    tvlUsd: 12_340_000,
    tvlChangePct24h: 2.1,
    coinCount: 5,
    coinCountChangePct24h: 0,

    description: 'Top decentralized finance tokens.',
    creationDate: '2025-02-01T00:00:00Z',
    updatedAt: '2025-08-20T08:45:00Z',

    weighting: {
      type: 'EQUAL',
      label: 'Equal Weight',
      description: 'Each asset has the same share of the index.',
    },

    constituents: [
      wCap(UNI, 20.0, 4_700_000_000),
      wCap(AAVE, 20.0, 1_400_000_000),
      wCap(CRV, 20.0, 480_000_000),
      wCap(MKR, 20.0, 2_900_000_000),
      wCap(SNX, 20.0, 900_000_000),
    ],

    methodologyUrl: 'https://normal.finance/methodology/defi-leaders-5',

    events: [
      { type: 'CREATION', assetName: 'DeFi Leaders 5', timestamp: '2025-02-01T00:00:00Z' },
      { type: 'REBALANCE', assetShortname: 'UNI', percent: 20, timestamp: '2025-06-01T00:00:00Z' },
    ],

    createdByUser: true,
  },
  {
    id: 3,
    avatar: '/assets/images/index/index-avatar-ai.webp',
    name: 'AI & Infrastructure',
    slug: 'ai',
    url: '/index/ai',

    priceUsd: 15.73,
    priceChangePct24h: 3.25,
    tvlUsd: 7_890_000,
    tvlChangePct24h: 1.5,
    coinCount: 4,
    coinCountChangePct24h: 0,

    description: 'Focuses on AI-related and infrastructure.',
    creationDate: '2025-03-10T00:00:00Z',
    updatedAt: '2025-08-27T14:20:00Z',

    weighting: {
      type: 'MARKET_CAP',
      label: 'Market Cap',
      description: 'Weighted according to each project’s circulating market cap.',
    },

    constituents: [
      wCap(GRT, 40.0, 2_100_000_000),
      wCap(FIL, 30.0, 2_400_000_000),
      wCap(RNDR, 20.0, 2_700_000_000),
      wCap(NEAR, 10.0, 4_300_000_000),
    ],

    methodologyUrl: 'https://normal.finance/methodology/ai-infra',

    events: [
      { type: 'CREATION', assetName: 'AI & Infrastructure', timestamp: '2025-03-10T00:00:00Z' },
      { type: 'ADD', assetShortname: 'RNDR', timestamp: '2025-04-22T10:00:00Z' },
    ],

    createdByUser: true,
  },
];

export const buildStats = (idx: IndexDetails): SingleStat[] => [
  {
    title: 'Index Price',
    total: idx.priceUsd,
    percent: idx.priceChangePct24h,
    formatter: fCurrency,
  },
  {
    title: 'Total TVL',
    total: idx.tvlUsd,
    percent: idx.tvlChangePct24h,
    formatter: fCurrency,
  },
  {
    title: 'Coin Count',
    total: idx.coinCount,
    percent: idx.coinCountChangePct24h,
    formatter: fShortenNumber,
  },
];

export default function ExploreIndexesView() {
  const { t } = useTranslate();

  const buildSparkline = (priceNow: number, pct24h: number, points = 24) => {
    const then = priceNow / (1 + pct24h / 100);
    const result: number[] = [];

    for (let i = 0; i < points; i += 1) {
      const progress = i / (points - 1);
      const base = then + (priceNow - then) * progress;
      const wiggle =
        1 + 0.004 * Math.sin(progress * Math.PI * 2) + 0.003 * Math.sin(progress * 5.2);
      result.push(Number((base * wiggle).toFixed(2)));
    }
    return result;
  };

  const spark0 = useMemo(
    () => buildSparkline(INDEXES[0].priceUsd, INDEXES[0].priceChangePct24h, 28),
    []
  );

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <Stack spacing={1} maxWidth={600}>
          <Typography variant="h4" color="text.primary">
            {t('Explore Indexes')}
          </Typography>
        </Stack>

        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <IndexCard index={INDEXES[0]} highlightType="staff-pick" chartSeries={spark0} />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <IndexCard index={INDEXES[1]} highlightType="trending" chartSeries={spark0} />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <IndexCard index={INDEXES[2]} highlightType="gainer" chartSeries={spark0} />
          </Grid2>
        </Grid2>

        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12 }}>
            <ExploreIndexesTable indexes={INDEXES} loading={false} />
          </Grid2>
        </Grid2>

        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12 }}>
            <IndexFundsInfoSection />
          </Grid2>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

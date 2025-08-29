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

/* Base tokens */
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

/* Helper to merge weight */
const w = (tok: Token, weightPct: number): WeightedToken => ({ ...tok, weightPct });

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
      label: 'Market Cap Weighted',
      description: 'Weights each asset according to its circulating-market-cap share.',
    },

    /* Only four assets for the demo; others 0 % */
    constituents: [
      w(BTC, 48.0),
      w(ETH, 25.5),
      w(SOL, 15.0),
      w(XRP, 7.5),
      w(XRP, 7.5),
      w(XRP, 7.5),
      w(XRP, 7.5),
      w(XRP, 7.5),
      w(XRP, 7.5),
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
      const progress = i / (points - 1); // 0..1
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
            <IndexCard index={INDEXES[0]} highlightType="trending" chartSeries={spark0} />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <IndexCard index={INDEXES[0]} highlightType="gainer" chartSeries={spark0} />
          </Grid2>
        </Grid2>

        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12 }}>
            <IndexFundsInfoSection />
          </Grid2>
        </Grid2>

        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12 }}>
            <ExploreIndexesTable indexes={INDEXES} loading={false} />
          </Grid2>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

'use client';

import type { PoolTxRow } from '@/types/pools';
import type { SingleStat } from '@/components/_explore-page-components';
import type { Token, IndexDetails, WeightedToken } from '@normalfinance/types';

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
    name: 'Blue-Chip Top 10',
    slug: 'blue-chip-10',

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
  },
];

const TABLE_ROWS: PoolTxRow[] = [
  {
    type: 'Buy',
    timestamp: Date.now() - 60 * 60 * 1000,
    tokenAAmount: 120.5,
    tokenBAmount: 360.0,
    user: 'GB6P...3K9Q',
    txHash: 'a1f3e0b2c4d5e6f7a8b9c0d1e2f3a4b5',
  },
  {
    type: 'Sell',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    tokenAAmount: 75.2,
    tokenBAmount: 210.4,
    user: 'GC7X...P0ZT',
    txHash: 'b2c4d5e6f7a8b9c0d1e2f3a4b5a1f3e0',
  },
  {
    type: 'Buy',
    timestamp: Date.now() - 6 * 60 * 60 * 1000,
    tokenAAmount: 300.0,
    tokenBAmount: 915.3,
    user: 'GD1M...L8QW',
    txHash: 'c4d5e6f7a8b9c0d1e2f3a4b5a1f3e0b2',
  },
  {
    type: 'Sell',
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
    tokenAAmount: 48.9,
    tokenBAmount: 150.2,
    user: 'GE9K...R2VX',
    txHash: 'd5e6f7a8b9c0d1e2f3a4b5a1f3e0b2c4',
  },
  {
    type: 'Buy',
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    tokenAAmount: 510.75,
    tokenBAmount: 1610.0,
    user: 'GF2H...M7NP',
    txHash: 'e6f7a8b9c0d1e2f3a4b5a1f3e0b2c4d5',
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
            <IndexCard index={INDEXES[0]} highlightType="staff-pick" />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <IndexCard index={INDEXES[0]} highlightType="trending" />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <IndexCard index={INDEXES[0]} highlightType="gainer" />
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

'use client';

import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import Grid2 from '@mui/material/Grid2';
import { Box, Stack, Typography } from '@mui/material';
import { ProfileCover } from '@/sections/rewards/profile-cover';
import { format } from '@normalfinance/utils';
import { usePersistStore } from '@normalfinance/state';
import Card from '@mui/material/Card';
import type { IndexDetails, WeightedToken, IndexEvent } from '@normalfinance/types';
import type { Token } from '@normalfinance/types';
import { fCurrency, fCurrencyCompact, fShortenNumber } from '@/utils/format-number';
import { SingleStat } from '@/components/_explore-page-components';
import ExploreStats from '@/components/_explore-page-components/explore-stats/explore-stats';
import IndexMetaCard from '@/components/_index-details/index-meta-card';
import TokenActionCard from '@/components/_common/token-action-card';
import IndexPieChart from '@/components/_index-details/index-pie-chart';
import { alpha, useTheme } from '@mui/material/styles';
import { IndexHistoryTimeline } from '@/components/_index-details/index-history-timeline';
import { createChartData, RealtimeChartData } from '@/utils/portfolio-value-chart-series';
import { AreaChartCard, LegendValue } from '@/components/_common/area-chart-card';

const data24h = [
  3444, 3600, 3750, 3900, 4100, 4300, 4500, 4700, 4900, 5200, 5400, 5500, 5650, 5800, 6000, 6200,
  6400, 6600, 6800, 7000, 7200, 7300, 7320, 7334,
];
const data7d = [3444, 4000, 4800, 8200, 5800, 6800, 7334];
const data30d = [
  3444, 3500, 3600, 3700, 3800, 3900, 4000, 4200, 4300, 4400, 4500, 4600, 4800, 5000, 5200, 5400,
  5600, 5800, 6000, 6200, 6400, 6600, 6800, 7000, 7100, 7200, 7250, 7300, 7320, 7330, 7334,
];
// Hardcoded 12 month data

// Create chart data objects using our helper.
const chartData24h: RealtimeChartData = createChartData('24h', data24h, 8);
const chartData7d: RealtimeChartData = createChartData('7d', data7d, 7);
const chartData30d: RealtimeChartData = createChartData('30d', data30d, 8);

// Combine chart data into one object.
const portfolioChartData: { [key in '24h' | '7d' | '30d']: RealtimeChartData } = {
  '24h': chartData24h,
  '7d': chartData7d,
  '30d': chartData30d,
};

const myLegendValues: LegendValue[] = [
  { title: 'Balance', number: 7334, formatter: fCurrencyCompact },
];

const makeToken = (id: number, name: string, short: string, logo: string): Token => ({
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
});

/* Base tokens */
const BTC = makeToken(
  1,
  'Bitcoin',
  'BTC',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png'
);
const ETH = makeToken(
  2,
  'Ethereum',
  'ETH',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png'
);
const SOL = makeToken(
  3,
  'Solana',
  'SOL',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png'
);
const XRP = makeToken(
  4,
  'Ripple',
  'XRP',
  'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png'
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
      type: 'MARKET_CAP',
      label: 'Market Cap Weighted',
      description: 'Weights each asset according to its circulating-market-cap share.',
    },

    /* Only four assets for the demo; others 0 % */
    constituents: [w(BTC, 48.0), w(ETH, 25.5), w(SOL, 15.0), w(XRP, 7.5)],

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

interface User {
  id: string;
  displayName: string;
  photoURL: string;
}

interface UserAbout {
  role: string;
  coverUrl: string;
}

const USER_DATA = {
  user: {
    id: 'u001',
    photoURL: '/assets/avatar/avatar_1.jpg',
  } as User,

  about: {
    role: 'Product Designer',
    coverUrl: '/assets/images/normal-images/normal-gradient.webp',
  } as UserAbout,
};

export default function IndexDetailsView() {
  const theme = useTheme();
  const { t } = useTranslate();
  const walletAddress = usePersistStore((s) => s.wallet.address);

  const idx = INDEXES[0];

  const stats = buildStats(idx);

  const { user, about } = USER_DATA;
  const walletLabel =
    walletAddress && walletAddress.length > 0
      ? format.fTruncate(walletAddress, 12)
      : t('Not connected');

  const swapFeeInfo = { feePercentage: 0, networkCost: 0.5, priceImpact: 0, maxSlippage: 0 };
  const TOKENS_LIST: Token[] = [BTC, ETH, SOL, XRP];

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <Stack spacing={1} maxWidth={600}>
          <Typography variant="h4" color="text.primary">
            {t('Index details')}
          </Typography>
        </Stack>
        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12 }}>
            <Card sx={{ mb: 3, height: 290 }}>
              <ProfileCover
                name={walletLabel}
                avatarUrl={user.photoURL}
                coverUrl={about.coverUrl}
              />
            </Card>
          </Grid2>
        </Grid2>
        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12, md: 8 }}>
            <ExploreStats stats={stats} />
          </Grid2>

          <Grid2 size={{ xs: 12, md: 4 }}>
            <IndexMetaCard index={idx} />
          </Grid2>
        </Grid2>

        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <TokenActionCard
              tokensList={TOKENS_LIST}
              swapFeeInfo={swapFeeInfo}
              cashBalance={0}
              enabledTabs={['send', 'buy']}
              initialTab="send"
              sx={{ borderRadius: 3, border: 1, borderColor: alpha(theme.palette.grey[500], 0.32) }}
            />
          </Grid2>

          <Grid2 size={{ xs: 12, md: 8 }}>
            <IndexPieChart
              title="Index Assets Overview"
              subheader="A consolidated snapshot of every underlying holding in the index."
              index={idx}
              sx={{
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            />
          </Grid2>
        </Grid2>

        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <IndexHistoryTimeline events={idx.events ?? []} />
          </Grid2>

          <Grid2 size={{ xs: 12, md: 8 }}>
            <AreaChartCard
              id="portfolio_value"
              title="Portfolio Value"
              chart={portfolioChartData}
              legendValues={myLegendValues}
              color={theme.palette.primary.main}
            />
          </Grid2>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

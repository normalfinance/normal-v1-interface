'use client';

import type { UiPoolTxRow } from '@/types/pools';
import type { TokenActionQueryParams } from '@/types/query-params';
import type { SingleStat } from '@/components/_explore-page-components';
import type { LegendValue } from '@/components/_common/area-chart-card';
import type { TokenActionKey } from '@/components/_common/token-action-card';
import type { Token, IndexDetails, WeightedToken } from '@normalfinance/types';

import { useEffect } from 'react';
import { useTranslate } from '@/locales';
import { format } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';
import { ProfileCover } from '@/sections/rewards/profile-cover';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { createChartData } from '@/utils/portfolio-value-chart-series';
import { fCurrency, fShortenNumber, fCurrencyCompact } from '@/utils/format-number';

import Card from '@mui/material/Card';
import Grid2 from '@mui/material/Grid2';
import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { AreaChartCard } from '@/components/_common/area-chart-card';
import TokenActionCard from '@/components/_common/token-action-card';
import IndexMetaCard from '@/components/_index-details/index-meta-card';
import IndexPieChart from '@/components/_index-details/index-pie-chart';
import IndexDetailsTable from '@/components/_index-details/index-details-table';
import { IndexHistoryTimeline } from '@/components/_index-details/index-history-timeline';
import ExploreStats from '@/components/_explore-page-components/explore-stats/explore-stats';

const data1d = [
  0, 0.3, 0.6, 0.9, 1.1, 1.0, 1.3, 1.5, 1.7, 1.6, 1.8, 2.0, 2.1, 2.2, 2.4, 2.5, 2.7, 2.9, 3.0, 3.1,
  3.0, 3.2, 3.3, 3.4,
];

const data1w = [0, 0.4, 1.0, 0.8, 1.6, 2.1, 2.4];
const data2w = Array.from({ length: 14 }, (_, i) => (i - 7) * 0.3 + 3);
const data1m = Array.from({ length: 31 }, (_, i) => Math.sin(i / 6) * 2 + i * 0.15);
const data3m = Array.from({ length: 91 }, (_, i) => Math.sin(i / 10) * 4 + i * 0.08);
const data6m = Array.from({ length: 181 }, (_, i) => Math.sin(i / 12) * 7 + i * 0.05);
const data1y = Array.from({ length: 12 }, (_, i) => i * 2.5 + (i % 2 ? 1 : -1));
const data3y = Array.from({ length: 36 }, (_, i) => i * 1.1 + Math.sin(i / 3) * 2.5);
const data5y = Array.from({ length: 60 }, (_, i) => i * 0.9 + Math.sin(i / 5) * 3.5);

// Create chart data objects using our helper.
const chart1d = createChartData('1d', data1d);
const chart1w = createChartData('1w', data1w);
const chart2w = createChartData('2w', data2w);
const chart1m = createChartData('1m', data1m);
const chart3m = createChartData('3m', data3m);
const chart6m = createChartData('6m', data6m);
const chart1y = createChartData('1y', data1y);
const chart3y = createChartData('3y', data3y);
const chart5y = createChartData('5y', data5y);

// Combine chart data into one object.
const indexReturnChartData = {
  '1d': chart1d,
  '1w': chart1w,
  '2w': chart2w,
  '1m': chart1m,
  '3m': chart3m,
  '6m': chart6m,
  '1y': chart1y,
  '3y': chart3y,
  '5y': chart5y,
};

const myLegendValues: LegendValue[] = [
  { title: 'Balance', number: 7334, formatter: fCurrencyCompact },
];

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

const TABLE_ROWS: UiPoolTxRow[] = [
  {
    type: 'Buy',
    timestamp: Date.now() - 60 * 60 * 1000,
    tokenAAmount: 120.5,
    tokenBAmount: 360.0,
    deltaA: 120.5,
    user: 'GB6P...3K9Q',
    txHash: 'a1f3e0b2c4d5e6f7a8b9c0d1e2f3a4b5',
  },
  {
    type: 'Sell',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    tokenAAmount: 75.2,
    tokenBAmount: 210.4,
    deltaA: -75.2,
    user: 'GC7X...P0ZT',
    txHash: 'b2c4d5e6f7a8b9c0d1e2f3a4b5a1f3e0',
  },
  {
    type: 'Buy',
    timestamp: Date.now() - 6 * 60 * 60 * 1000,
    tokenAAmount: 300.0,
    tokenBAmount: 915.3,
    deltaA: 300.0,
    user: 'GD1M...L8QW',
    txHash: 'c4d5e6f7a8b9c0d1e2f3a4b5a1f3e0b2',
  },
  {
    type: 'Sell',
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
    tokenAAmount: 48.9,
    tokenBAmount: 150.2,
    deltaA: -48.9,
    user: 'GE9K...R2VX',
    txHash: 'd5e6f7a8b9c0d1e2f3a4b5a1f3e0b2c4',
  },
  {
    type: 'Buy',
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    tokenAAmount: 510.75,
    tokenBAmount: 1610.0,
    deltaA: 510.75,
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

  const { params } = useQueryParams<TokenActionQueryParams>();
  const { tokens, getAllTokens, globalIsLoading, setGlobalIsLoading } = useAppStore();

  // Determine which tab to show based on query params, default to 'swap'
  const activeTab: TokenActionKey = params?.tab || 'index-buy';

  // Determine which tabs should be enabled (you can customize this logic)
  const enabledTabs: TokenActionKey[] = ['index-buy', 'index-sell'];

  const getCardQueryParams = () => {
    if (!params) return undefined;

    switch (activeTab) {
      case 'swap':
        return {
          asset: params.asset,
          token_in: params.token_in,
          token_out: params.token_out,
          in_amount: params.in_amount,
          out_minimum: params.out_minimum,
        };
      case 'send':
        return {
          token: params.token,
          amount: params.amount,
          destination: params.destination,
        };
      case 'buy':
        return {
          token: params.token,
          amount: params.amount,
        };
      case 'index-buy':
        return {
          token: params.token,
          amount: params.amount,
        };
      default:
        return undefined;
    }
  };

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      setGlobalIsLoading(true);
      try {
        await getAllTokens();
        setGlobalIsLoading(false);
      } catch (e) {
        console.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, []);

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
              tokensList={tokens}
              swapFeeInfo={swapFeeInfo}
              cashBalance={1000}
              queryParams={getCardQueryParams()}
              loading={globalIsLoading}
              enabledTabs={enabledTabs}
              initialTab={activeTab}
              userIndexBalanceTokens={idx.priceUsd}
              index={idx}
              sx={{
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
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
              id="index_return"
              title="Index Return"
              chart={indexReturnChartData}
              percentage
              legendValues={myLegendValues}
              color={theme.palette.primary.main}
              sx={{
                borderRadius: 3,
                border: 1,
                borderColor: alpha(theme.palette.grey[500], 0.32),
              }}
            />
          </Grid2>
        </Grid2>

        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12 }}>
            <IndexDetailsTable
              baseTokenSymbol="BTC"
              quoteTokenSymbol="XLM"
              rows={TABLE_ROWS}
              xlmPrice={0.12}
            />
          </Grid2>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

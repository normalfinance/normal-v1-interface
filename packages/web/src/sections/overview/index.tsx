'use client';

import Grid2 from '@mui/material/Grid2';
import { AssetsAndLiabilities } from '@/components/_overview-page-components/assets-and-liabilities/assets-and-liabilities';
import { DashboardContent } from '@/layouts/dashboard';
import { Stack, Typography, useTheme } from '@mui/material';
import { Markets } from '@/components/_overview-page-components/markets/markets';
import { MarketTable } from '@/components/_overview-page-components/market-table/market-table';
import { createChartData, RealtimeChartData } from 'src/utils/portfolio-value-chart-series';
import { StatCardData } from '@/types/stat-card-data';
import { fCurrencyCompact, fShortenNumber } from '@/utils/format-number';
import { StatCard } from '@/components/_common/stat-card';
import { AreaChartCard, LegendValue } from '@/components/_common/area-chart-card';
import { SwapSendCard } from '@/components/_common/swap-send-card';
import { Token } from '@/types/token';
import { SwapFeeInfo } from '@/types/swap-fee-info';

export default function OverviewView() {
  const theme = useTheme();

  // -------------------------
  // Hardcoded chart data arrays.
  // -------------------------

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

  // -------------------------
  // Other temporary props.
  // -------------------------
  const _appRelated = [
    {
      id: '1',
      name: 'Microsoft office 365',
      size: 1024,
      price: 0,
      shortcut: '/assets/icons/apps/ic-app-1.webp',
      downloaded: 1500,
      ratingNumber: 4.5,
      totalReviews: 100,
    },
  ];

  const statCardsData: StatCardData[] = [
    {
      title: 'Total 24h Trading Volume',
      percent: 0.6,
      total: 212350000,
      formatter: fShortenNumber,
      chartType: 'bar', // typed literal
      displayChart: false,
      chart: {
        colors: [theme.palette.success.light, theme.palette.success.main],
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [139390, 134590, 149390, 169390, 139390, 179390, 149390],
      },
    },
    {
      title: 'Total 30d Trading Volume',
      percent: -80.6,
      total: 5690000000,
      formatter: fShortenNumber,
      chartType: 'bar',
      displayChart: false,
      chart: {
        colors: [theme.palette.info.light, theme.palette.info.main],
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [24930, 34930, 64930, 74930, 24930, 54930, 74930],
      },
    },
    {
      title: 'Total Value Locked',
      percent: 0.6,
      total: 883470000,
      formatter: fShortenNumber,
      chartType: 'bar',
      displayChart: false,
      chart: {
        colors: [theme.palette.warning.light, theme.palette.warning.main],
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [2.981, 7.981, 7.981, 10, 4.981, 3.981, 7.981],
      },
    },
  ];

  const _markets = [
    {
      id: '1',
      name: 'BTC-SOL',
      coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg',
      price: 1.69,
      percentage: -2.5,
      url: '/markets/btc-sol',
    },
    {
      id: '2',
      name: 'ETH-SOL',
      coverUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Ethereum-icon-purple.svg',
      price: 55.47,
      percentage: 5.2323425,
      url: '/markets/eth-sol',
    },
    {
      id: '3',
      name: 'XRP-SOL',
      coverUrl: 'https://cryptologos.cc/logos/xrp-xrp-logo.svg?v=040',
      price: 93.1,
      percentage: 3.1,
      url: '/markets/xrp-sol',
    },
  ];

  const marketGroups = [
    { id: 'new_markets', title: 'New Markets', list: _markets },
    { id: 'trending_markets', title: 'Trending Markets', list: _markets },
    { id: 'top_gainer_markets', title: 'Top Gainer Markets', list: _markets },
  ];

  // -------------------------
  // Hardcoded marketList (simulate fetched user data)
  // -------------------------

  const allMarkets = [
    {
      id: '1',
      name: 'BTC-SOL',
      price: 1531.34325346456,
      percentageChange: 4.5,
      performance: 'CEO',
      status: 'trending',
      avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg',
      url: '/markets/btc-sol',
    },
    {
      id: '2',
      name: 'ETH-SOL',
      price: 531.32,
      percentageChange: 2.5,
      performance: 'CEO',
      status: 'meme',
      avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Ethereum-icon-purple.svg',
      url: '/markets/btc-sol',
    },
    {
      id: '3',
      name: 'XRP-SOL',
      price: 731.32,
      percentageChange: -2.5,
      performance: 'CEO',
      status: 'rwa',
      avatarUrl: 'https://cryptologos.cc/logos/xrp-xrp-logo.svg?v=040',
      url: '/markets/btc-sol',
    },
  ];

  const tokensList: Token[] = [
    {
      id: 1,
      url: 'https://token-icons.s3.amazonaws.com/eth.png',
      name: 'Ethereum',
      shortname: 'ETH',
      owned: true,
      countstatus: 0.02106,
      pricestatus: 2814.25,
      featured: true,
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    },
    {
      id: 2,
      url: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
      name: 'USDC',
      shortname: 'USDC',
      owned: false,
      countstatus: 0,
      pricestatus: 0.9998,
      featured: true,
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    },
    {
      id: 3,
      url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      name: 'Tether',
      shortname: 'USDT',
      owned: false,
      countstatus: 0,
      pricestatus: 0.9999,
      featured: true,
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    },

    {
      id: 4,
      url: 'https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png?1696507857',
      name: 'Wrapped Bitcoin',
      shortname: 'WBTC',
      owned: false,
      countstatus: 0,
      pricestatus: 95799.17,
      featured: true,
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    },
    {
      id: 5,
      url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      name: 'Wrapped Ether',
      shortname: 'WETH',
      owned: false,
      countstatus: 0,
      pricestatus: 2806.75,
      featured: true,
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    },
    {
      id: 6,
      url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      name: 'Wrapped Ether',
      shortname: 'WETH',
      owned: false,
      countstatus: 0,
      pricestatus: 2806.75,
      featured: false,
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    },
  ];

  const swapFeeInfo: SwapFeeInfo = {
    feePercentage: 0.25,
    networkCost: 1.0,
    priceImpact: -0.3,
    maxSlippage: 0.5,
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          Welcome back 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Account Overview
        </Typography>
      </Stack>
      {/* First row: PortfolioValue/AssetsAndLiabilities */}
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 8 }}>
          <AreaChartCard
            id="portfolio_value"
            title="Portfolio Value"
            chart={portfolioChartData}
            legendValues={myLegendValues}
            color={theme.palette.primary.main} // for example, using a different color
          />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          {/*<AssetsAndLiabilities title="Assets & Liabilities" list={_appRelated} />*/}
          <SwapSendCard tokensList={tokensList} swapFeeInfo={swapFeeInfo} />
        </Grid2>
      </Grid2>
      {/* Second row: TradingVolume items */}
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        {statCardsData.map((item, index) => (
          <Grid2 key={index} size={{ xs: 12, md: 4 }}>
            <StatCard
              title={item.title}
              percent={item.percent}
              total={item.total}
              formatter={item.formatter}
              chartType={item.chartType}
              displayChart={item.displayChart}
              chart={item.chart}
            />
          </Grid2>
        ))}
      </Grid2>
      {/* Third row: Markets items */}
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        {marketGroups.map((group) => (
          <Grid2 key={group.id} size={{ xs: 12, md: 4 }}>
            <Markets id={group.id} title={group.title} list={group.list} />
          </Grid2>
        ))}
      </Grid2>
      {/* Fourth row: Markets table */}
      <Grid2 sx={{ mt: 3 }}>
        <MarketTable markets={allMarkets} />
      </Grid2>
    </DashboardContent>
  );
}

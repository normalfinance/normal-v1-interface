'use client';

import type { StatCardData } from '@/types/stat-card-data';
import type { InsuranceQueryParams } from '@/types/query-params';

import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';
import { fCurrency, fRawPercent } from '@/utils/format-number';
import { useBuffer, useOracle, useInsuranceFund } from '@/hooks';

import Grid2 from '@mui/material/Grid2';
import { Box, Stack, useTheme, Typography } from '@mui/material';

import { StatCard } from '@/components/_common/stat-card';
import { StakeBalance } from '@/components/_insurance-page-components/stake-balance-card';
import { InsuranceActionsTable } from '@/components/_insurance-page-components/insurance-actions-table-card';

export default function InsuranceView() {
  const theme = useTheme();
  const { t } = useTranslate();

  // Get insurance query params
  const { params: insuranceParams } = useQueryParams<InsuranceQueryParams>();

  const {
    loading: loadingIF,
    error: errorIF,
    balance: ifBalance,
    insuranceFund,
    stake,
  } = useInsuranceFund();
  const { loading, error, buffer } = useBuffer();

  const { loading: loadingPrice, error: priceError, price: xlmPrice } = useOracle('XLM');

  // Stat card data array
  const statCardsData: StatCardData[] = [
    {
      title: 'Normal Buffer',
      description: 'Minor-loss cushion',
      percent: 0,
      total: buffer?.reserve.balance || 0,
      formatter: fCurrency,
      chartType: 'line',
      displayChart: true,
      chart: {
        colors: ['#4BABFF', '#4BABFF'],
        categories: ['Current'],
        series: [0],
      },
    },
    {
      title: 'Normal Insurance Fund',
      description: 'Claims coverage pool',
      percent: 0,
      total: ifBalance || 0,
      formatter: fCurrency,
      chartType: 'line',
      displayChart: true,
      chart: {
        colors: ['#FF4BE1', '#FF4BE1'],
        categories: ['Current'],
        series: [0],
      },
    },
    {
      title: 'Insurance Staking Yield',
      description: 'Live annual yield',
      percent: 0,
      total: insuranceFund?.current_rate || 0,
      formatter: fRawPercent,
      chartType: 'line',
      displayChart: true,
      chart: {
        colors: ['#FF8A4B', '#FF8A4B'],
        categories: ['Current'],
        series: [0],
      },
    },
  ];

  const userStakeFiatValue = xlmPrice && stake?.if_shares ? Number(stake?.if_shares * xlmPrice) : 0;

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <Stack spacing={1} maxWidth={600}>
          <Typography variant="h4" color="text.primary">
            {t('Insurance')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t(
              "Stake XLM into the Insurance Fund and earn a portion of the fees from swaps. The Insurance Fund is the protocol's backstop to maintaining the solvency of the protocol."
            )}
          </Typography>
        </Stack>
        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          {statCardsData.map((item, index) => (
            <Grid2 key={index} size={{ xs: 12, md: 4 }}>
              <StatCard
                title={item.title}
                description={item.description}
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
        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <StakeBalance
              title={t('Staked balance')}
              yieldPercent={insuranceFund?.current_rate || 0}
              staked={stake?.if_shares}
              currentBalance={userStakeFiatValue}
              queryParams={insuranceParams}
            />
          </Grid2>

          <Grid2 size={{ xs: 12, md: 8 }}>
            <InsuranceActionsTable />
          </Grid2>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

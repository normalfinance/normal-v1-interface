'use client';

import type { StatCardData } from '@/types/stat-card-data';

import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { fRawPercent, fShortenNumber } from '@/utils/format-number';
import { useBuffer, useOracle, useInsuranceFund } from '@/hooks/stellar';

import Grid2 from '@mui/material/Grid2';
import { Stack, useTheme, Typography } from '@mui/material';

import { StatCard } from '@/components/_common/stat-card';
import { StakeBalance } from '@/components/_insurance-page-components/stake-balance-card';
import { InsuranceActionsTable } from '@/components/_insurance-page-components/insurance-actions-table-card';

export default function InsuranceView() {
  const theme = useTheme();
  const { t } = useTranslate();

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
      percent: 0,
      total: buffer?.reserve.balance || 0,
      formatter: fShortenNumber,
      chartType: 'bar',
      displayChart: true,
      chart: {
        colors: [theme.palette.success.light, theme.palette.success.main],
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [139390, 134590, 149390, 169390, 139390, 179390, 149390],
      },
    },
    {
      title: 'Normal Insurance Fund',
      percent: 0,
      total: ifBalance || 0,
      formatter: fShortenNumber,
      chartType: 'bar',
      displayChart: true,
      chart: {
        colors: [theme.palette.info.light, theme.palette.info.main],
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [24930, 34930, 64930, 74930, 24930, 54930, 74930],
      },
    },
    {
      title: 'Current Insurance Fund Yield',
      percent: 0,
      total: insuranceFund?.current_rate || 0,
      formatter: fRawPercent,
      chartType: 'bar',
      displayChart: true,
      chart: {
        colors: [theme.palette.warning.light, theme.palette.warning.main],
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [2.981, 7.981, 7.981, 10, 4.981, 3.981, 7.981],
      },
    },
  ];

  const userStakeFiatValue = xlmPrice && stake?.if_shares ? Number(stake?.if_shares * xlmPrice) : 0;

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          {t('Insurance')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t(
            'Review how insured the Normal Protocol is and earn yield by providing additional funds'
          )}
        </Typography>
      </Stack>
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
      <Stack sx={{ mt: 3, maxWidth: '976px', mx: 'auto', px: 2 }} textAlign="center">
        <Typography variant="body1" color="text.secondary">
          {t(
            'Insurance covering protocol debt is covered first by the Normal Buffer, which receives a portion of protocol revenue, and then by the Normal Insurance Fund, which pays yield to 3rd party liquidity providers.'
          )}
        </Typography>
      </Stack>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <StakeBalance
            title={t('Staked balance')}
            yieldPercent={insuranceFund?.current_rate || 0}
            staked={stake?.if_shares}
            currentBalance={userStakeFiatValue}
          />
        </Grid2>

        <Grid2 size={{ xs: 12, md: 8 }} />
      </Grid2>
      <Grid2 sx={{ mt: 3 }}>
        <InsuranceActionsTable />
      </Grid2>
    </DashboardContent>
  );
}

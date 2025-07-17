'use client';

import type { StatCardData } from '@/types/stat-card-data';

import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { fCurrency, fRawPercent } from '@/utils/format-number';
import { useBuffer, useOracle, useInsuranceFund } from '@/hooks';

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
      formatter: fCurrency,
      chartType: 'bar',
      displayChart: true,
      chart: {
        colors: [theme.palette.success.light, theme.palette.success.main],
        categories: ['Current'],
        series: [139390],
      },
    },
    {
      title: 'Normal Insurance Fund',
      percent: 0,
      total: ifBalance || 0,
      formatter: fCurrency,
      chartType: 'bar',
      displayChart: true,
      chart: {
        colors: [theme.palette.info.light, theme.palette.info.main],
        categories: ['Current'],
        series: [24930],
      },
    },
    {
      title: 'Insurance Staking Yield',
      percent: 0,
      total: insuranceFund?.current_rate || 0,
      formatter: fRawPercent,
      chartType: 'bar',
      displayChart: true,
      chart: {
        colors: [theme.palette.warning.light, theme.palette.warning.main],
        categories: ['Current'],
        series: [2.981],
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
            "Stake XLM into the Insurance Fund and earn a portion of the fees from swaps. The Insurance Fund is the protocol's backstop to maintaining the solvency of the protocol."
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
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <StakeBalance
            title={t('Staked balance')}
            yieldPercent={insuranceFund?.current_rate || 0}
            staked={stake?.if_shares}
            currentBalance={userStakeFiatValue}
          />
        </Grid2>

        <Grid2 size={{ xs: 12, md: 8 }}>
          <InsuranceActionsTable />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

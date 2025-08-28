'use client';

import type { StatCardData } from '@/types/stat-card-data';
import type { InsuranceQueryParams } from '@/types/query-params';

import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { format } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';
import { useTokenPrice, useInsuranceFund } from '@/hooks';
import { fCurrency, fRawPercent } from '@/utils/format-number';

import Grid2 from '@mui/material/Grid2';
import { Box, Stack, Typography } from '@mui/material';

import { StatCard } from '@/components/_common/stat-card';
import { StakeBalance } from '@/components/_insurance-page-components/stake-balance-card';
import { InsuranceActionsTable } from '@/components/_insurance-page-components/insurance-actions-table-card';

export default function InsuranceView() {
  const { t } = useTranslate();

  // Get insurance query params
  const { params: insuranceParams } = useQueryParams<InsuranceQueryParams>();

  const { insuranceFund, stake } = useInsuranceFund();

  const { price: xlmPrice } = useTokenPrice('XLM');

  // Insurance Fund USD value
  const insuranceFundValue = useMemo(() => {
    if (xlmPrice && insuranceFund) {
      const balance = format.formatTokenAmount(insuranceFund.reserve.balance);
      return xlmPrice.multipliedBy(balance);
    } else return BigNumber(0);
  }, [xlmPrice, insuranceFund]);

  // Connected user's stake USD value
  const stakeValue = useMemo(() => {
    if (xlmPrice && stake) {
      const shares = format.formatTokenAmount(stake.shares);
      return xlmPrice.multipliedBy(shares);
    } else return BigNumber(0);
  }, [xlmPrice, stake]);

  // Stat card data array
  const statCardsData: StatCardData[] = [
    {
      title: 'Normal Insurance Fund',
      description: 'Claims coverage pool',
      percent: 0,
      total: insuranceFundValue.toNumber(),
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
      title: 'Optimal Insurance',
      description: 'Max coverage needed',
      percent: 0,
      total: insuranceFund ? Number(insuranceFund.optimal_insurance) : 0,
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
      total: insuranceFund ? insuranceFund.current_rate.dividedBy(100).toNumber() : 0,
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
              yieldPercent={insuranceFund?.current_rate.toNumber() || 0}
              staked={BigNumber(stake ? stake.shares : 0)}
              currentBalance={Number(stakeValue.toFixed(2))}
              queryParams={insuranceParams}
              unstakingPeriod={insuranceFund ? Number(insuranceFund.unstaking_period) : 1123200}
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

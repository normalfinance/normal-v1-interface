'use client';

import type { StatCardData } from '@/types/stat-card-data';
import type { InsuranceQueryParams } from '@/types/query-params';

import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';
import { formatTokenAmount } from '@/utils/format-stellar';
import { fCurrency, fRawPercent } from '@/utils/format-number';
import { useBuffer, useTokenPrice, useInsuranceFund } from '@/hooks';

import Grid2 from '@mui/material/Grid2';
import { Box, Stack, Typography } from '@mui/material';

import { StatCard } from '@/components/_common/stat-card';
import { StakeBalance } from '@/components/_insurance-page-components/stake-balance-card';
import { InsuranceActionsTable } from '@/components/_insurance-page-components/insurance-actions-table-card';

export default function InsuranceView() {
  const { t } = useTranslate();

  // Get insurance query params
  const { params: insuranceParams } = useQueryParams<InsuranceQueryParams>();

  const { balance: insuranceFundBalance, insuranceFund, stake } = useInsuranceFund();

  const { buffer } = useBuffer();

  const { price: xlmPrice } = useTokenPrice('XLM');

  // Insurance Fund USD value
  const insuranceFundValue = useMemo(() => {
    if (xlmPrice && insuranceFundBalance) {
      const balance = formatTokenAmount(insuranceFundBalance);
      const xlm_price = BigNumber(formatTokenAmount(xlmPrice, 14));
      return xlm_price.multipliedBy(balance);
    }
    return BigNumber(0);
  }, [xlmPrice, insuranceFundBalance]);

  // Buffer USD value
  const bufferValue = useMemo(() => {
    if (xlmPrice && buffer && buffer.reserve) {
      const reserve_balance = BigNumber(formatTokenAmount(buffer.reserve.balance));
      const xlm_price = BigNumber(formatTokenAmount(xlmPrice, 14));
      return reserve_balance.multipliedBy(xlm_price);
    }
    return BigNumber(0);
  }, [xlmPrice, buffer]);

  // Connected user's stake USD value
  const stakeValue = useMemo(() => {
    if (xlmPrice && stake) {
      const shares = formatTokenAmount(stake.if_shares);
      const xlm_price = BigNumber(formatTokenAmount(xlmPrice, 14));
      return xlm_price.multipliedBy(shares);
    }
    return BigNumber(0);
  }, [xlmPrice, stake]);

  // Stat card data array
  const statCardsData: StatCardData[] = [
    {
      title: 'Normal Buffer',
      description: 'Minor-loss cushion',
      percent: 0,
      total: bufferValue.toNumber(),
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
              staked={BigNumber(stake ? stake.if_shares : 0)}
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

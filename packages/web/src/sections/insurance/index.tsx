'use client';

import type { StatCardData } from '@/types/stat-card-data';
import type { InsuranceQueryParams } from '@/types/query-params';

import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { format } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useQueryParams } from '@/hooks/use-query-params';
import { fCurrency, fRawPercent } from '@/utils/format-number';
import { useBuffer, useTokenPrice, useInsuranceFund } from '@/hooks';

import Grid2 from '@mui/material/Grid2';
import { Box, Stack, Typography } from '@mui/material';

import { StatCard } from '@/components/_common/stat-card';
import { StakeBalance } from '@/components/_insurance-page-components/stake-balance-card';
import { InsuranceActionsTable } from '@/components/_insurance-page-components/insurance-actions-table-card';
import { LogoLoader } from '@/components/_async/logo-loader';

export default function InsuranceView() {
  const { t } = useTranslate();
  const { params: insuranceParams } = useQueryParams<InsuranceQueryParams>();

  const {
    balance: insuranceFundBalance,
    insuranceFund,
    stake,
    loading: fundLoading,
  } = (useInsuranceFund() as any) ?? {};
  const { buffer, loading: bufferLoading } = (useBuffer() as any) ?? {};
  const { price: xlmPrice, loading: priceLoading } = (useTokenPrice('XLM') as any) ?? {};

  const price = Number(xlmPrice ?? 0);

  const insuranceFundValue = useMemo(() => {
    const bal = insuranceFundBalance ? format.formatTokenAmount(insuranceFundBalance) : 0;
    return BigNumber(format.formatTokenAmount(price, 14)).multipliedBy(bal);
  }, [price, insuranceFundBalance]);

  const bufferValue = useMemo(() => {
    const reserveBal = buffer?.reserve?.balance
      ? BigNumber(format.formatTokenAmount(buffer.reserve.balance))
      : BigNumber(0);
    return BigNumber(format.formatTokenAmount(price, 14)).multipliedBy(reserveBal);
  }, [price, buffer]);

  const stakeValue = useMemo(() => {
    const shares = stake?.if_shares ? format.formatTokenAmount(stake.if_shares) : 0;
    return BigNumber(format.formatTokenAmount(price, 14)).multipliedBy(shares);
  }, [price, stake]);

  const isLoading =
    Boolean(priceLoading ?? xlmPrice === undefined) ||
    Boolean(fundLoading ?? (insuranceFund === undefined || insuranceFundBalance === undefined)) ||
    Boolean(bufferLoading ?? buffer === undefined);

  if (isLoading) {
    return <LogoLoader fullScreen size={420} />;
  }

  const statCardsData: StatCardData[] = [
    {
      title: 'Normal Buffer',
      description: 'Minor-loss cushion',
      percent: 0,
      total: bufferValue.toNumber(),
      formatter: fCurrency,
      chartType: 'line',
      displayChart: true,
      chart: { colors: ['#4BABFF', '#4BABFF'], categories: ['Current'], series: [0] },
    },
    {
      title: 'Normal Insurance Fund',
      description: 'Claims coverage pool',
      percent: 0,
      total: insuranceFundValue.toNumber(),
      formatter: fCurrency,
      chartType: 'line',
      displayChart: true,
      chart: { colors: ['#FF4BE1', '#FF4BE1'], categories: ['Current'], series: [0] },
    },
    {
      title: 'Insurance Staking Yield',
      description: 'Live annual yield',
      percent: 0,
      total: insuranceFund ? insuranceFund.current_rate.dividedBy(100).toNumber() : 0,
      formatter: fRawPercent,
      chartType: 'line',
      displayChart: true,
      chart: { colors: ['#FF8A4B', '#FF8A4B'], categories: ['Current'], series: [0] },
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

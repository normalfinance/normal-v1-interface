'use client';

import type { LegendValue } from '@/components/_common/area-chart-card';
import type { RealtimeChartData } from '@/utils/portfolio-value-chart-series';

import { useEffect } from 'react';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { useLiquidityPositions, useQueryParams } from '@/hooks';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { createChartData } from '@/utils/portfolio-value-chart-series';
import { fRawPercent, fCurrencyTwoDecimals } from '@/utils/format-number';

import { useTheme } from '@mui/material/styles';
import { Box, Grid2, Stack, Typography } from '@mui/material';

import { AreaChartCard } from '@/components/_common/area-chart-card';
import { BalanceCard } from '@/components/_earn-page-components/balance-card';
import { PositionsTable } from '@/components/_earn-page-components/positions-table';
import { DepositLiquidityQueryParams } from '@/types/query-params';
import AddLiquidityDialog from '@/components/_earn-page-components/add-liquidity-dialog';

// ----------------------------------------------------------------------

export default function EarnView() {
  const theme = useTheme();
  const { t } = useTranslate();

  const { params } = useQueryParams<DepositLiquidityQueryParams>();

  const { positions } = useLiquidityPositions();

  const { setGlobalIsLoading, modalState, setModalView } = useAppStore();

  const { wallet, getAllTokens, getAllPools } = usePersistStore();

  // Effect hook to fetch all pools and tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllPools();
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address]);

  // Current balance data array for the CurrentBalance component
  const currentBalanceData = [
    {
      title: 'Current balance',
      yieldPercent: 92.84,
      staked: 1400,
      currentBalance: 1492.84,
      rows: [
        { label: 'Earned', value: 92.84, formatter: fCurrencyTwoDecimals },
        { label: 'Staked', value: 1400, formatter: fCurrencyTwoDecimals },
        { label: 'Yield', value: 6.73, formatter: fRawPercent },
      ],
    },
    // Add more items here if needed...
  ];

  // -------------------------
  // Hardcoded chart data arrays.
  // -------------------------
  const data12m = [1000, 1200, 1100, 1300, 1250, 1400, 1350, 1500, 1450, 1600, 1550, 1700];

  // Create chart data objects using our helper.

  const chartData12m: RealtimeChartData = createChartData('12m', data12m, 6);

  // Combine chart data into one object.
  const usageBondingCurveData: { [key in '12m']: RealtimeChartData } = {
    '12m': chartData12m,
  };

  const myLegendValues: LegendValue[] = [
    { title: 'Total Balance', number: 6.483, formatter: fRawPercent },
  ];

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        {/* <PageHeader title={t('Your positions')} /> */}

        <Stack spacing={1}>
          <Typography variant="h4" color="text.primary">
            {t('Earn')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t(
              'Review how insured the Normal Protocol is and earn yield by providing additional funds'
            )}
          </Typography>
        </Stack>

        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          {currentBalanceData.map((balance, index) => (
            <Grid2 key={index} size={{ xs: 12, md: 4 }}>
              <BalanceCard
                title={balance.title}
                currentBalance={balance.currentBalance}
                averageYieldPercent={balance.yieldPercent}
                liquidityProvided={balance.staked}
              />
            </Grid2>
          ))}
          <Grid2 size={{ xs: 12, md: 8 }}>
            <AreaChartCard
              id="portfolio_value"
              title="Estimated Earnings"
              subheader="Your earnings projected over time"
              chart={usageBondingCurveData}
              legendValues={myLegendValues}
              color={theme.palette.secondary.main} // for example, using a different color
            />
          </Grid2>

          <Grid2 size={{ xs: 12, md: 12 }}>
            <PositionsTable positions={positions ?? []} loading={false} queryParams={undefined} />
          </Grid2>

          {/* TODO: transaction history */}
        </Grid2>

        <AddLiquidityDialog
          open={modalState.addLiquidity}
          onClose={() => setModalView('addLiquidity', false)}
          // queryParams={queryParams}
        />
      </DashboardContent>
    </Box>
  );
}

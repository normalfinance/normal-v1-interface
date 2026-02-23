'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslate } from '@/locales';
import { useManageLiquidity } from '@/hooks';
import { logger } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import { Box, Grid2, Stack, Typography } from '@mui/material';

import { InlineError } from '@/components/_common/errors';
import MintRedeemCard from '@/components/_common/mint-redeem-card';
import { BalanceCard } from '@/components/_earn-page-components/balance-card';
import { PositionsTable } from '@/components/_earn-page-components/positions-table';
import { EarnOverviewCard } from '@/components/_earn-page-components/earn-overview';

import { BigNumber } from 'bignumber.js';
// ----------------------------------------------------------------------

export default function EarnView() {
  const { t } = useTranslate();

  // const { params } = useQueryParams<DepositLiquidityQueryParams>();

  const { loading, liquidityPositions, totalValue, error, clearError } = useManageLiquidity();

  const { setGlobalIsLoading } = useAppStore();

  const { wallet, getAllTokens, getAllPairs } = usePersistStore();

  const [openEstimate, setOpenEstimate] = useState(false);

  // Effect hook to fetch all pairs and tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllPairs();
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address]);



  const rows = useMemo(
    () => [
      {
        key: 'collateral',
        label: 'Collateral',
        balanceUsd: 6543.21,
        apy: 0.04,
        showManage: true,
      },
      {
        key: 'blend',
        label: 'Blend',
        balanceUsd: 9987.65,
        apy: 0.152,
        showManage: true,
      },
      {
        key: 'liquidity',
        label: 'Liquidity',
        balanceUsd: 1937.65,
        apy: 0.152,
        showManage: false,
      },
    ],
    []
  );



  const totalCapitalDeployedUsd = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.balanceUsd ?? 0), 0);
  }, [rows]);

  const blendedYield = useMemo(() => {
    // Weighted APY: sum(balance * apy) / sum(balance)
    const total = totalCapitalDeployedUsd;
    if (!total) return 0;

    const weighted = rows.reduce((sum, r) => {
      const bal = r.balanceUsd ?? 0;
      const apy = r.apy ?? 0;
      return sum + bal * apy;
    }, 0);

    return weighted / total;
  }, [rows, totalCapitalDeployedUsd]);

  const annualYieldUsd = totalCapitalDeployedUsd * blendedYield;


  const totalEarningsUsd = 494.78;

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <Stack spacing={1}>
          <Typography variant="h4" color="text.primary">
            {t('Earn Account')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t(
              'Generate high-interest APY on your USD and compound dividends on each of your assets.'
            )}
          </Typography>
        </Stack>

        <Grid2 sx={{ mt: 3 }}>
          <EarnOverviewCard
            totalCapitalDeployedUsd={totalCapitalDeployedUsd}
            blendedYield={blendedYield}
            annualYieldUsd={annualYieldUsd}
            totalEarningsUsd={totalEarningsUsd}
            earnedTodayUsd={2.5}
            rows={rows as any}
            onCalculateClick={() => setOpenEstimate(true)}
            onBridgeClick={() => console.log('bridge')}
            onAllocateClick={() => setOpenEstimate(true)}
            onRowAction={(rowKey, action) => {
              console.log('row action', rowKey, action);
            }}
          />
        </Grid2>

        <InlineError error={error} onClose={clearError} sx={{ mt: 3 }} />

        <Grid2 container spacing={3} sx={{ mt: 3 }}>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <BalanceCard
              title={t('Total balance')}
              totalBalance={totalValue.toFixed(2)}
              liquidityProvided={totalValue.toString()}
            />
          </Grid2>

          <Grid2 size={{ xs: 12, md: 8 }}>
            <PositionsTable
              positions={liquidityPositions ?? []}
              loading={loading}
              queryParams={undefined}
            />
          </Grid2>

          <Grid2 size={{ xs: 12, md: 4 }}>
            <MintRedeemCard />
          </Grid2>
        </Grid2>
      </DashboardContent>
    </Box>
  );
}

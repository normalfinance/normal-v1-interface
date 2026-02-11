'use client';

import { useEffect } from 'react';
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

// ----------------------------------------------------------------------

export default function EarnView() {
  const { t } = useTranslate();

  // const { params } = useQueryParams<DepositLiquidityQueryParams>();

  const { loading, liquidityPositions, totalValue, error, clearError } = useManageLiquidity();

  const { setGlobalIsLoading } = useAppStore();

  const { wallet, getAllTokens, getAllPairs } = usePersistStore();

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

  return (
    <Box
      sx={(theme) => ({
        minHeight: '100dvh',
        bgcolor: theme.palette.grey[100],
        ...theme.applyStyles('dark', { bgcolor: theme.palette.background.default }),
      })}
    >
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

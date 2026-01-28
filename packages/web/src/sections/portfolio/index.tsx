'use client';

import React, { useEffect } from 'react';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import { Grid2, Stack, Typography } from '@mui/material';

import { MyBalanceSection } from '@/components/_assets-page-components';

export default function PortfolioView() {
  const { t } = useTranslate();

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
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          {t('Portfolio')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('View your total balance, asset breakdown, and more.')}
        </Typography>
      </Stack>

      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 width={1} sx={{ mt: 3 }}>
          <MyBalanceSection />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

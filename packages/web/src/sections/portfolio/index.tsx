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
  const { wallet, getAllTokens } = usePersistStore();

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address, getAllTokens, setGlobalIsLoading]);

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          {t('Portfolio')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('View your total balance and asset breakdown.')}
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

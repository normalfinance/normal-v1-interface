'use client';

import React, { useEffect } from 'react';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import { Grid2, Stack, Typography } from '@mui/material';

import SavingsCard from '@/components/_common/savings-card';
import DepositCard from '@/components/_common/deposit-card';

export default function SavingsView() {
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
          {t('Savings')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('Earn yield on your USDC by depositing into Normal Savings.')}
        </Typography>
      </Stack>

      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <SavingsCard />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Stack spacing={3}>
            <Typography variant="h6" color="text.primary">
              {t('Need USDC?')}
            </Typography>
            <DepositCard />
          </Stack>
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

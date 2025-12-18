'use client';

import { useEffect } from 'react';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import Grid2 from '@mui/material/Grid2';
import { Stack, Typography } from '@mui/material';

import { NewIndexForm } from '@/components/_create-index-components/new-index-form';

export default function CreateIndexView() {
  const { t } = useTranslate();

  const { setGlobalIsLoading } = useAppStore();
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

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          {t('Create an Index Fund')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('Automate or diversify your investing by creating a custom index fund.')}
        </Typography>
      </Stack>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 8, lg: 7 }}>
          <NewIndexForm />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }} />
      </Grid2>
    </DashboardContent>
  );
}

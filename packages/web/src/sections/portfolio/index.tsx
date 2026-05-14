'use client';

import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import React, { useMemo, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';

import { Grid2, Stack, Typography } from '@mui/material';

import { MyBalanceSection, MySavingsSection } from '@/components/_assets-page-components';

export default function PortfolioView() {
  const { t } = useTranslate();

  const { setGlobalIsLoading } = useAppStore();
  const { wallet, getAllTokens } = usePersistStore();

  const { vaultInfo, userPosition, fetching, positionFetching } = useDefindexSavings();

  const savingsValue = useMemo(() => {
    const v = parseFloat(userPosition?.currentValue || '0');
    return v > 0 ? v : 0;
  }, [userPosition]);

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
          <MyBalanceSection savingsValue={savingsValue} />
        </Grid2>
        <Grid2 width={1}>
          <MySavingsSection
            vaultInfo={vaultInfo}
            userPosition={userPosition}
            fetching={fetching}
            positionFetching={positionFetching}
          />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

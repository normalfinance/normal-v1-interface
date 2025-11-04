'use client';

import { useEffect } from 'react';
import { useTranslate } from '@/locales';
import { logger } from '@normalfinance/utils';
import { useLiquidityPositions } from '@/hooks';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import { Box } from '@mui/material';

import PageHeader from '@/components/page-header';
import { WalletGate } from '@/components/_common/wallet-gate';
import { PositionsTable } from '@/components/_positions-page-components/positions-table';

// ----------------------------------------------------------------------

export default function PositionsView() {
  const { t } = useTranslate();

  const { positions } = useLiquidityPositions();

  const { setGlobalIsLoading } = useAppStore();

  const { wallet, getAllTokens, getAllPools } = usePersistStore();

  // Effect hook to fetch all tokens and pools once the component mounts
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
  }, [wallet.address]);

  // Effect hook to fetch all pools once the component mounts
  useEffect(() => {
    const refreshPools = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllPools();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshPools();
  }, []);

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <PageHeader title={t('Your positions')} />

        <WalletGate buttonText={t('Connect wallet to view positions')} fullWidth>
          <PositionsTable positions={positions ?? []} />
        </WalletGate>
      </DashboardContent>
    </Box>
  );
}

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

  const { getAllTokens, getAllPools } = usePersistStore();

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      setGlobalIsLoading(true);
      try {
        await Promise.all([await getAllTokens(), await getAllPools()]);
        setGlobalIsLoading(false);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
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

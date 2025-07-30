'use client';

import { useTranslate } from '@/locales';
import { useLiquidityPositions } from '@/hooks';
import { DashboardContent } from '@/layouts/dashboard';

import { Box } from '@mui/material';

import PageHeader from '@/components/page-header';
import { WalletGate } from '@/components/_common/wallet-gate';
import { PositionsTable } from '@/components/_positions-page-components/positions-table';

// ----------------------------------------------------------------------

export default function PositionsView() {
  const { t } = useTranslate();

  const { positions } = useLiquidityPositions();

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <PageHeader title={t('Your positions')} />

        <WalletGate buttonText={t('Connect Wallet to view positions')} fullWidth>
          <PositionsTable positions={positions ?? []} />
        </WalletGate>
      </DashboardContent>
    </Box>
  );
}

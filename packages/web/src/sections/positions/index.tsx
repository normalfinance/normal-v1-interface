'use client';

import { useTranslate } from '@/locales';
import { useLiquidityPositions } from '@/hooks';
import { DashboardContent } from '@/layouts/dashboard';

import { Box } from '@mui/material';

import PageHeader from '@/components/page-header';
import { WalletGate } from '@/components/_common/wallet-gate';
import { PositionsTable } from '@/components/_positions-page-components/positions-table';
import { LogoLoader } from '@/components/_async/logo-loader';

export default function PositionsView() {
  const { t } = useTranslate();
  const lp = useLiquidityPositions() as any;
  const positions = lp?.positions ?? [];
  const isLoading = lp?.isLoading ?? lp?.positions === undefined;

  if (isLoading) {
    return <LogoLoader fullScreen size={420} />;
  }

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <PageHeader title={t('Your positions')} />

        <WalletGate buttonText={t('Connect Wallet to view positions')} fullWidth>
          <PositionsTable positions={positions} />
        </WalletGate>
      </DashboardContent>
    </Box>
  );
}

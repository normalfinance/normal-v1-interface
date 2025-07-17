'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { useLPTokens } from '@/hooks/stellar/use-lp-tokens';

import { Grid2 } from '@mui/material';

import PageHeader from '@/components/page-header';
import { WalletGate } from '@/components/_common/wallet-gate';
import { PositionsTable } from '@/components/_positions-page-components/positions-table';

// ----------------------------------------------------------------------

export default function PositionsView() {
  const { t } = useTranslate();

  const persist = usePersistStore();
  const connectedAddress = persist.wallet.address;
  const [isConnected] = useState(connectedAddress != '' && connectedAddress != undefined);

  const { positions } = useLPTokens();

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader title={t('Your positions')} />

      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 12 }}>
          <WalletGate buttonText={t('Connect Wallet to view positions')} fullWidth>
            <PositionsTable positions={positions ?? []} />
          </WalletGate>
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

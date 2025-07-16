'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { useLPTokens } from '@/hooks/stellar/use-lp-tokens';

import { Alert, Grid2, AlertTitle } from '@mui/material';

import PageHeader from '@/components/page-header';
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
          {isConnected ? (
            <PositionsTable positions={positions ?? []} />
          ) : (
            <Alert severity="info">
              <AlertTitle>{t('Connect your wallet')}</AlertTitle>
              {t('To view your positions and rewards you must connect your wallet')}
            </Alert>
          )}
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

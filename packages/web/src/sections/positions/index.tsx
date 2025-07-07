import { useState } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';

import { Alert, Grid2 } from '@mui/material';

import PageHeader from '@/components/page-header';

// ----------------------------------------------------------------------

export default function PositionsView() {
  const persist = usePersistStore();

  // const { positions } = useLPs();
  // const { pools } = usePools();

  const connectedAddress = persist.wallet.address;
  const [isConnected,] = useState(connectedAddress != '' && connectedAddress != undefined);

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader title="Your positions" subheader="Liquidity you've provided to pools" />

      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 12 }}>
          {isConnected ? (
            <LiquidityPositions positions={positions} />
          ) : (
            <Alert
              severity="info"
              title="To view your positions and rewards you must connect your wallet."
            />
          )}
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

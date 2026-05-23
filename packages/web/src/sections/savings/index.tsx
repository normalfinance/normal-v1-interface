'use client';

import { useEffect, useMemo } from 'react';
import { logger } from '@normalfinance/utils';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';
import { DashboardContent } from '@/layouts/dashboard';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import SavingsCard from '@/components/_common/savings-card';

import { SavingsHeroCard } from './savings-hero-card';
import { SavingsOnrampCard } from './savings-onramp-card';
import { SavingsHistoryCard } from './savings-history-card';

export default function SavingsView() {
  const { setGlobalIsLoading } = useAppStore();
  const { wallet, getAllTokens } = usePersistStore();

  const { vaultInfo, userPosition, fetching, positionFetching } = useDefindexSavings();

  const currentValue = useMemo(
    () => Math.max(parseFloat(userPosition?.currentValue || '0'), 0),
    [userPosition]
  );
  const totalDeposited = useMemo(
    () => Math.max(parseFloat(userPosition?.totalDeposited || '0'), 0),
    [userPosition]
  );
  const earnings = useMemo(
    () => parseFloat(userPosition?.earnings || '0'),
    [userPosition]
  );
  const apy = vaultInfo ? Number(vaultInfo.apy) : null;
  const heroLoading = fetching || positionFetching;

  useEffect(() => {
    if (!wallet.address) return undefined;

    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllTokens(true);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };

    const timer = setTimeout(refreshTokens, 100);
    return () => clearTimeout(timer);
  }, [wallet.address, getAllTokens, setGlobalIsLoading]);

  return (
    <DashboardContent maxWidth="xl">
      {/* Page title */}
      <Stack spacing={0.5} sx={{ mb: '24px' }}>
        <Typography sx={{ fontSize: '22px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}>
          Savings
        </Typography>
        <Typography sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.5)' }}>
          Earn yield on your USDC by depositing into Normal Savings.
        </Typography>
      </Stack>

      {/* Hero stats */}
      <SavingsHeroCard
        currentValue={currentValue}
        totalDeposited={totalDeposited}
        earnings={earnings}
        apy={apy}
        loading={heroLoading}
      />

      {/* Action + Onramp */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '3fr 2fr' },
          gap: '20px',
          mt: '20px',
        }}
      >
        <SavingsCard />
        <SavingsOnrampCard />
      </Box>

      {/* Transaction history */}
      {wallet.address && (
        <Box sx={{ mt: '20px' }}>
          <SavingsHistoryCard walletAddress={wallet.address} />
        </Box>
      )}
    </DashboardContent>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { logger } from '@normalfinance/utils';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';
import { DashboardContent } from '@/layouts/dashboard';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import SavingsCard from '@/components/_common/savings-card';

import { SavingsHeroCard } from './savings-hero-card';
import { SavingsOnrampCard } from './savings-onramp-card';
import { SavingsHistoryCard } from './savings-history-card';

export default function SavingsView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

  if (!mounted) {
    return (
      <DashboardContent maxWidth="xl">
        <Skeleton variant="rectangular" height={220} sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.08)' }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: '20px', mt: '20px' }}>
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.06)' }} />
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.06)' }} />
        </Box>
      </DashboardContent>
    );
  }

  if (!wallet.address) {
    return (
      <DashboardContent maxWidth="xl">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '16px',
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              bgcolor: '#F4F4F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(10,10,15,0.4)',
            }}
          >
            <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Box sx={{ fontSize: '16px', fontWeight: 500, color: '#0A0A0F', mb: '6px' }}>
              Connect your wallet
            </Box>
            <Box sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.5)', maxWidth: 280 }}>
              Sign in to view your savings and start earning yield.
            </Box>
          </Box>
          <Box
            component="button"
            onClick={() => window.dispatchEvent(new CustomEvent('nf:open-login'))}
            sx={{
              mt: '4px',
              px: '24px',
              py: '10px',
              borderRadius: '10px',
              border: 'none',
              bgcolor: '#0A0A0F',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'opacity 150ms',
              '&:hover': { opacity: 0.85 },
            }}
          >
            Sign in
          </Box>
        </Box>
      </DashboardContent>
    );
  }

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
        walletAddress={wallet.address || undefined}
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

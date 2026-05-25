'use client';

import React, { useEffect, useState } from 'react';
import { logger } from '@normalfinance/utils';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { DashboardContent } from '@/layouts/dashboard';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import SwapCard from '@/components/_common/swap-card';
import { SavingsOnrampCard } from '../savings/savings-onramp-card';

export default function SwapView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { setGlobalIsLoading } = useAppStore();
  const { wallet, getAllTokens } = usePersistStore();

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

  if (!mounted) {
    return (
      <DashboardContent maxWidth="xl">
        <Skeleton variant="rectangular" height={48} width={200} sx={{ borderRadius: '12px', bgcolor: 'rgba(10,10,15,0.08)', mb: '24px' }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: '20px' }}>
          <Skeleton variant="rectangular" height={420} sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.06)' }} />
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
              Sign in to swap tokens between XLM and USDC.
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
      <Stack spacing={0.5} sx={{ mb: '24px' }}>
        <Typography sx={{ fontSize: '22px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}>
          Swap
        </Typography>
        <Typography sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.5)' }}>
          Exchange XLM and USDC instantly with the best rates.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '3fr 2fr' },
          gap: '20px',
          alignItems: 'start',
        }}
      >
        <SwapCard />
        <SavingsOnrampCard />
      </Box>
    </DashboardContent>
  );
}

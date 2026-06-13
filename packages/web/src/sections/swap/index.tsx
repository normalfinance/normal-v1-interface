'use client';

import { logger } from '@normalfinance/utils';
import React, { useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { ActivityCard } from '@/sections/portfolio/portfolio-activity-card';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import SwapCard from '@/components/_common/swap-card';

import { LifiSwapCard } from './lifi-swap-card';
import { SavingsOnrampCard } from '../savings/savings-onramp-card';

export default function SwapView() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'stellar' | 'crosschain'>('stellar');
  useEffect(() => { setMounted(true); }, []);

  const { setGlobalIsLoading } = useAppStore();
  const { wallet, getAllTokens } = usePersistStore();
  const { bitcoinAddress } = useBtcPortfolio(true);
  const { ethereumAddress } = useEthPortfolio(true);
  const { solanaAddress } = useSolPortfolio(true);

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

  // Deep-link preselect (/swap?from=USDC). Safe to read here: this code only
  // runs after the `mounted` gate above, so window always exists.
  const fromParam = new URLSearchParams(window.location.search).get('from')?.toUpperCase();
  const initialTokenIn = fromParam === 'USDC' || fromParam === 'XLM' ? fromParam : undefined;

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', mb: '24px' }}>
        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: '22px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}>
            Swap
          </Typography>
          <Typography sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.5)' }}>
            {mode === 'stellar'
              ? 'Exchange XLM and USDC instantly with the best rates.'
              : 'Swap BTC, ETH and SOL across networks — delivered to your own wallet.'}
          </Typography>
        </Stack>

        {/* Mode toggle */}
        <Box sx={{ display: 'inline-flex', bgcolor: 'rgba(10,10,15,0.04)', borderRadius: '999px', p: '4px', gap: '2px' }}>
          {([
            { value: 'stellar', label: 'Stellar' },
            { value: 'crosschain', label: 'Cross-chain' },
          ] as const).map((item) => (
            <Box
              key={item.value}
              component="button"
              onClick={() => setMode(item.value)}
              sx={{
                px: '16px',
                py: '7px',
                borderRadius: '999px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 150ms, color 150ms',
                bgcolor: mode === item.value ? '#fff' : 'transparent',
                color: mode === item.value ? '#0A0A0F' : 'rgba(10,10,15,0.45)',
                boxShadow: mode === item.value ? '0 1px 2px rgba(10,10,15,0.08)' : 'none',
              }}
            >
              {item.label}
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '3fr 2fr' },
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {mode === 'stellar' ? (
          <>
            <SwapCard initialTokenIn={initialTokenIn} />
            <SavingsOnrampCard />
          </>
        ) : (
          <LifiSwapCard />
        )}
      </Box>

      {/* Activity under the active swap */}
      <Box sx={{ mt: '20px' }}>
        {mode === 'stellar' ? (
          <ActivityCard walletAddress={wallet.address} defaultTab="swaps" />
        ) : (
          <ActivityCard
            walletAddress={wallet.address}
            bitcoinAddress={bitcoinAddress}
            ethereumAddress={ethereumAddress}
            solanaAddress={solanaAddress}
            defaultTab="transfers"
          />
        )}
      </Box>
    </DashboardContent>
  );
}

'use client';

import { logger } from '@normalfinance/utils';
import React, { useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useTurnkeyWallet } from '@/hooks/use-turnkey-wallet';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { ActivityCard } from '@/sections/portfolio/portfolio-activity-card';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import { GetStartedPicker } from '@/components/_common/get-started-picker';
import WalletReadinessNotice from '@/components/_common/wallet-readiness-notice';
import NormalWalletSetupDialog from '@/components/_common/normal-wallet-setup-dialog';

import SwapCard from './swap-card';
import { SavingsOnrampCard } from '../savings/savings-onramp-card';

import type { SwapSymbol } from './engines/types';

export default function SwapView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { user } = useSupabaseAuth();
  const { setGlobalIsLoading } = useAppStore();
  const { wallet } = usePersistStore();
  const { bitcoinAddress } = useBtcPortfolio(true);
  const { ethereumAddress } = useEthPortfolio(true);
  const { solanaAddress } = useSolPortfolio(true);
  // #74: swap-page readiness notices — one per wallet that can't hold USDC
  // yet. The companion's fix runs through the guided setup dialog (passkey);
  // the connected wallet adds its own trustline inline.
  const { companionStellar } = useWalletBalances(!!user);
  const isExternalWallet = wallet.walletType != null && wallet.walletType !== 'normal-wallet';
  const [setupOpen, setSetupOpen] = useState(false);
  // Any wallet (Stellar or a Turnkey chain wallet); null = still checking.
  const { hasWallet: hasTurnkeyWallet } = useTurnkeyWallet(!!user);
  const hasAnyWallet = !!wallet.address || hasTurnkeyWallet === true;
  const walletChecking = !!user && !wallet.address && hasTurnkeyWallet === null;

  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address, setGlobalIsLoading]);

  if (!mounted || walletChecking) {
    return (
      <DashboardContent maxWidth="xl">
        <Skeleton
          variant="rectangular"
          height={48}
          width={200}
          sx={{ borderRadius: '12px', bgcolor: 'rgba(10,10,15,0.08)', mb: '24px' }}
        />
        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: '20px' }}
        >
          <Skeleton
            variant="rectangular"
            height={420}
            sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.06)' }}
          />
          <Skeleton
            variant="rectangular"
            height={200}
            sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.06)' }}
          />
        </Box>
      </DashboardContent>
    );
  }

  if (!hasAnyWallet) {
    // Signed in but no wallet yet → pick an asset (sets up the wallet), rather
    // than a dead-end "Sign in". Not signed in → sign in.
    if (user) {
      return (
        <DashboardContent maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: { xs: 4, md: 7 } }}>
            <Box
              sx={{
                width: '100%',
                maxWidth: 460,
                p: { xs: '24px', md: '32px' },
                borderRadius: '22px',
                border: '1px solid rgba(10,10,15,0.08)',
                bgcolor: '#fff',
                boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 16px rgba(10,10,15,0.04)',
              }}
            >
              <GetStartedPicker />
            </Box>
          </Box>
        </DashboardContent>
      );
    }

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
              Sign in to swap XLM, USDC, BTC, ETH and SOL.
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

  // Deep-link preselect (/swap?from=BTC). Safe to read here: this code only runs
  // after the `mounted` gate above, so window always exists.
  const fromParam = new URLSearchParams(window.location.search).get('from')?.toUpperCase();
  const VALID: SwapSymbol[] = ['XLM', 'USDC', 'BTC', 'ETH', 'SOL'];
  const initial = VALID.includes(fromParam as SwapSymbol) ? (fromParam as SwapSymbol) : undefined;

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ mb: '24px' }}>
        <Stack spacing={0.5}>
          <Typography
            sx={{ fontSize: '22px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}
          >
            Swap
          </Typography>
          <Typography sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.5)' }}>
            Exchange XLM, USDC, BTC, ETH and SOL — delivered to your own wallet.
          </Typography>
        </Stack>
      </Box>

      {/* #74: USDC-readiness notices, one per wallet, right wallet's signer.
          Self-hiding: render nothing while checking, on probe failure, or
          when the wallet is ready — most users never see this block. */}
      {wallet.address && (
        <Stack spacing={1} sx={{ mb: '16px' }}>
          <WalletReadinessNotice
            address={wallet.address}
            walletLabel={isExternalWallet ? connectedWalletLabel(wallet.walletType) : 'Your wallet'}
            kind="slot"
          />
          {isExternalWallet && companionStellar && (
            <WalletReadinessNotice
              address={companionStellar.address}
              walletLabel="Normal wallet"
              kind="companion"
              onOpenSetup={() => setSetupOpen(true)}
            />
          )}
        </Stack>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '3fr 2fr' },
          gap: '20px',
          alignItems: 'start',
        }}
      >
        <SwapCard initial={initial} />
        <SavingsOnrampCard />
      </Box>

      <NormalWalletSetupDialog
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        neededUsdc={0}
      />

      {/* Unified activity — swaps + cross-chain transfers */}
      <Box sx={{ mt: '20px' }}>
        <ActivityCard
          walletAddress={wallet.address}
          bitcoinAddress={bitcoinAddress}
          ethereumAddress={ethereumAddress}
          solanaAddress={solanaAddress}
          defaultTab="swaps"
        />
      </Box>
    </DashboardContent>
  );
}

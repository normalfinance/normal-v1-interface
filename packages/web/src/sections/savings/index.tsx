'use client';

import { logger } from '@/utils/logger';
import { useMemo, useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useSavingsPosition } from '@/hooks/use-savings-position';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import { AppBlock } from '@/components/_common/app-ui';
import { AppPageHeader } from '@/components/_common/brand';
import SavingsCard from '@/components/_common/savings-card';
import { TwoFactorPrompt } from '@/components/_common/two-factor-prompt';
import { ChainSetupDialog } from '@/components/_common/chain-setup-dialog';

import { SavingsOnrampCard } from './savings-onramp-card';
import { SavingsHistoryCard } from './savings-history-card';
import { SavingsXlmFeesCard } from './savings-xlm-fees-card';
import { SavingsHeroCard, SavingsEarningsCard } from './savings-hero-card';

export default function SavingsView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { user, isLoading: authLoading } = useSupabaseAuth();
  const [walletSetupOpen, setWalletSetupOpen] = useState(false);
  const { setGlobalIsLoading } = useAppStore();
  const { wallet } = usePersistStore();

  const { vaultInfo, userPosition, fetching, positionFetching } = useDefindexSavings();
  // #32: account-wide savings display — the hero must include the companion
  // Normal wallet's position when an external wallet is connected, or a
  // hybrid user's savings look vanished (observed live 2026-08-15). One
  // product, so summing is honest; deposit/withdraw stay per-wallet.
  const { companionPosition } = useSavingsPosition();

  const currentValue = useMemo(
    () =>
      Math.max(parseFloat(userPosition?.currentValue || '0'), 0) +
      Math.max(parseFloat(companionPosition?.currentValue || '0'), 0),
    [userPosition, companionPosition]
  );
  const totalDeposited = useMemo(
    () =>
      Math.max(parseFloat(userPosition?.totalDeposited || '0'), 0) +
      Math.max(parseFloat(companionPosition?.totalDeposited || '0'), 0),
    [userPosition, companionPosition]
  );
  const earnings = useMemo(
    () =>
      parseFloat(userPosition?.earnings || '0') + parseFloat(companionPosition?.earnings || '0'),
    [userPosition, companionPosition]
  );
  const apy = vaultInfo ? Number(vaultInfo.apy) : null;
  const heroLoading = fetching || positionFetching;

  // #75 round 2B: the chart + history read ONE wallet's savings activity.
  // With an external wallet connected, wallet.address is the (history-less)
  // slot — the flat $0 chart Niko reported — while the deposits live on the
  // companion. Point both at the wallet that actually HOLDS the savings.
  const { companionStellar } = useWalletBalances(true);
  const companionHoldsSavings =
    Math.max(parseFloat(companionPosition?.currentValue || '0'), 0) > 0 ||
    Math.max(parseFloat(companionPosition?.shares || '0'), 0) > 0;
  const savingsHistoryAddress =
    companionHoldsSavings && companionStellar ? companionStellar.address : wallet.address;

  // Hold the page skeleton until the savings figures are actually in, instead
  // of dropping it at hydration and letting the numbers arrive seconds later.
  // First paint only: once real data has rendered, background refetches must
  // never send the page back to a skeleton.
  const [firstPaintDone, setFirstPaintDone] = useState(false);
  useEffect(() => {
    if (!heroLoading) setFirstPaintDone(true);
  }, [heroLoading]);

  useEffect(() => {
    if (!wallet.address) return undefined;

    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };

    const timer = setTimeout(refreshTokens, 100);
    return () => clearTimeout(timer);
  }, [wallet.address, setGlobalIsLoading]);

  if (!mounted || authLoading || (!firstPaintDone && heroLoading)) {
    return (
      <DashboardContent>
        <Skeleton
          variant="rectangular"
          height={220}
          sx={{ borderRadius: 'var(--radius-lg)', bgcolor: 'rgba(10,10,15,0.08)' }}
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
            gap: 2,
            mt: 2,
          }}
        >
          <Skeleton
            variant="rectangular"
            height={320}
            sx={{ borderRadius: 'var(--radius-lg)', bgcolor: 'rgba(10,10,15,0.06)' }}
          />
          <Skeleton
            variant="rectangular"
            height={200}
            sx={{ borderRadius: 'var(--radius-lg)', bgcolor: 'rgba(10,10,15,0.06)' }}
          />
        </Box>
      </DashboardContent>
    );
  }

  // A remembered wallet address is not a login (see the portfolio view): signed
  // out always gets the sign-in screen.
  if (!user || !wallet.address) {
    return (
      <DashboardContent>
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
              borderRadius: 'var(--radius-md)',
              bgcolor: '#F4F4F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9A9AA3',
            }}
          >
            <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Box sx={{ fontSize: '16px', fontWeight: 500, color: '#0A0A0F', mb: '6px' }}>
              {user ? 'Set up your savings wallet' : 'Connect your wallet'}
            </Box>
            <Box sx={{ fontSize: '14px', color: '#6B6B76', maxWidth: 300 }}>
              {user
                ? 'Savings runs on Stellar. Create your Stellar wallet in one tap to start earning yield on USDC.'
                : 'Sign in to view your savings and start earning yield.'}
            </Box>
          </Box>
          <Box
            component="button"
            onClick={() =>
              user
                ? setWalletSetupOpen(true)
                : window.dispatchEvent(new CustomEvent('nf:open-login'))
            }
            sx={{
              mt: '4px',
              px: '24px',
              py: '10px',
              borderRadius: 'var(--radius-md)',
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
            {user ? 'Set up wallet' : 'Sign in'}
          </Box>
        </Box>

        {/* Lazy Stellar wallet creation — savings-specific setup happens here now,
            not at signup. On success the dialog connects the wallet, so the
            savings UI below appears automatically. */}
        {user && walletSetupOpen && (
          <ChainSetupDialog
            open
            onClose={() => setWalletSetupOpen(false)}
            chain="stellar"
            userId={user.id}
            userEmail={user.email}
            onSuccess={() => setWalletSetupOpen(false)}
          />
        )}
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <AppPageHeader title="Savings" subtitle="Your digital dollars, earning every day." />

      <TwoFactorPrompt hasFunds={currentValue > 0} />

      <SavingsHeroCard
        currentValue={currentValue}
        totalDeposited={totalDeposited}
        earnings={earnings}
        apy={apy}
        loading={heroLoading}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 7fr) minmax(0, 5fr)' },
          alignItems: 'start',
          gap: { xs: 4, lg: 3 },
          mt: { xs: 4, md: 5 },
        }}
      >
        <Stack spacing={4} sx={{ minWidth: 0, order: { xs: 2, lg: 1 } }}>
          <SavingsEarningsCard
            walletAddress={savingsHistoryAddress || undefined}
            earnings={earnings}
            currentValue={currentValue}
          />
          {/* Transaction history: same wallet as the chart (#75 round 2B). */}
          {savingsHistoryAddress && <SavingsHistoryCard walletAddress={savingsHistoryAddress} />}
        </Stack>

        {/* Putting money in and taking it out first on phones. #67: the fee
            explainer above the onramp card, the user's own order: "can I
            transact?" before "how do I add money?". */}
        <Stack spacing={2} sx={{ minWidth: 0, order: { xs: 1, lg: 2 } }}>
          <AppBlock title="Deposit or withdraw">
            <SavingsCard hideHeader sx={{ p: { xs: 0, md: 0 }, border: 'none' }} />
          </AppBlock>
          <SavingsXlmFeesCard />
          <SavingsOnrampCard />
        </Stack>
      </Box>
    </DashboardContent>
  );
}

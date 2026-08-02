'use client';

import type { PortfolioAsset } from '@/types/portfolio';

import { BigNumber } from 'bignumber.js';
import { logger } from '@normalfinance/utils';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useMemo, useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { useTurnkeyWallet } from '@/hooks/use-turnkey-wallet';
import { portfolioAssetToToken } from '@/lib/portfolio/display';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import SavingsCard from '@/components/_common/savings-card';
import { GetStartedPicker } from '@/components/_common/get-started-picker';

import { HeroCard } from './portfolio-hero-card';
import { HoldingsCard } from './portfolio-holdings-card';
import { ActivityCard } from './portfolio-activity-card';

import type { HoldingData } from './_shared';

// Shown until we know whether the user even has a wallet. Beyond that each
// card owns its own skeleton, so a slow source never blanks the whole page.
function PortfolioSkeleton() {
  return (
    <DashboardContent maxWidth="xl">
      {/* Hero skeleton */}
      <Skeleton variant="rectangular" height={220} sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.08)' }} />

      {/* Holdings + Savings skeleton */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: '20px', mt: '20px' }}>
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.06)' }} />
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.06)' }} />
      </Box>

      {/* Activity skeleton */}
      <Skeleton variant="rectangular" height={280} sx={{ borderRadius: '22px', bgcolor: 'rgba(10,10,15,0.06)', mt: '20px' }} />
    </DashboardContent>
  );
}

export default function PortfolioView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { user } = useSupabaseAuth();
  // Single source of truth for all balances + savings.
  const { getAsset, savings, savingsUsd, isLoading: balancesLoading } = usePortfolio(!!user);
  const bitcoinAddress = getAsset('BTC')?.address ?? null;
  const ethereumAddress = getAsset('ETH')?.address ?? null;
  const solanaAddress = getAsset('SOL')?.address ?? null;
  // "Has any wallet" — a Stellar Normal wallet OR a Turnkey chain wallet. Flips
  // reactively when a wallet is provisioned (refetchAddresses). `null` = still
  // checking, so we don't flash the picker at an existing user.
  const { hasWallet: hasTurnkeyWallet } = useTurnkeyWallet(!!user);

  const { setGlobalIsLoading } = useAppStore();
  const { wallet, getAllTokens } = usePersistStore();

  const hasAnyWallet = !!wallet.address || hasTurnkeyWallet === true;
  // Still resolving whether an authed user has a wallet — keep the skeleton so we
  // don't flash the "get started" picker at someone who actually has one.
  const walletChecking = !!user && !wallet.address && hasTurnkeyWallet === null;

  const savingsValue = savingsUsd;
  const earnings = savings.earnings;
  const savingsLoading = savings.vaultLoading || savings.positionLoading;


  // ONE source for every chain, including XLM/USDC.
  //
  // This page used to read Stellar assets from the persisted token store while
  // the home hero and the account drawer read them from the portfolio
  // aggregator. Two paths for the same two assets meant every loading bug had
  // to be fixed twice and this page always lagged behind the others. The token
  // list is exactly XLM + USDC on mainnet (Blend USDC on testnet) — the same
  // assets the aggregator returns — so there is nothing to lose by unifying.
  const walletTokens = useMemo(
    () =>
      (['XLM', 'USDC', 'BTC', 'ETH', 'SOL'].map(getAsset) as (PortfolioAsset | undefined)[])
        .filter(
          (a): a is PortfolioAsset => !!a && a.balance != null && BigNumber(a.balance).gt(0)
        )
        .map(portfolioAssetToToken),
    [getAsset]
  );

  // "Wallet" = everything the user holds outside of savings, on any chain
  const walletBalance = useMemo(
    () =>
      walletTokens.reduce(
        (acc, tkn) => acc + BigNumber(tkn.balance).multipliedBy(tkn.price).toNumber(),
        0
      ),
    [walletTokens]
  );
  const totalBalance = walletBalance + savingsValue;

  const holdingsData: HoldingData[] = useMemo(() => {
    const entries: HoldingData[] = walletTokens.map((tkn) => {
      const value = BigNumber(tkn.balance).multipliedBy(tkn.price).toNumber();
      return {
        token: tkn,
        value,
        percentage: totalBalance > 0 ? (value / totalBalance) * 100 : 0,
      };
    });

    if (savingsValue > 0) {
      entries.push({
        token: {
          symbol: 'Savings',
          contract: '__savings__',
          name: 'Normal Savings',
          issuer: '',
          org: '',
          domain: '',
          icon: 'https://cdn.normalapi.com/logo/logo-single.png',
          decimals: 4,
          featured: false,
          balance: String(savingsValue),
          price: '1',
          percentageChange: 0,
        },
        value: savingsValue,
        percentage: totalBalance > 0 ? (savingsValue / totalBalance) * 100 : 0,
      });
    }

    return entries.sort((a, b) => b.value - a.value);
  }, [walletTokens, totalBalance, savingsValue]);

  // Nothing on this page reads the token store any more, but the swap card and
  // the account drawer still do — so we keep refreshing it here and simply
  // stop blocking this page's rendering on it. Retiring the store entirely is
  // the remaining half of the duplicate-data-path cleanup (#7/#12).
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

  if (!mounted || walletChecking) {
    return <PortfolioSkeleton />;
  }

  if (!hasAnyWallet) {
    // Signed in but no wallet yet (e.g. skipped the asset picker) → let them pick
    // an asset here instead of a dead-end "Sign in". Not signed in → sign in.
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
              Sign in to view your portfolio, holdings, and activity.
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
      <HeroCard
        totalBalance={totalBalance}
        walletBalance={walletBalance}
        savingsValue={savingsValue}
        earnings={earnings}
        // The totals here sum BOTH sources — native-chain balances and the
        // Stellar token store. Gating on savings alone let the figure paint
        // before XLM/USDC landed, so the number visibly jumped a beat later.
        loading={savingsLoading || balancesLoading}
        holdingsData={holdingsData}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
          gap: '20px',
          mt: '20px',
        }}
      >
        <HoldingsCard
          holdingsData={holdingsData}
          totalBalance={totalBalance}
          loading={balancesLoading || (savings.positionLoading && holdingsData.length === 0)}
        />
        <SavingsCard sx={{ minWidth: 0, overflow: 'hidden' }} />
      </Box>

      <Box sx={{ mt: '20px' }}>
        <ActivityCard
          walletAddress={wallet.address}
          bitcoinAddress={bitcoinAddress}
          ethereumAddress={ethereumAddress}
          solanaAddress={solanaAddress}
        />
      </Box>
    </DashboardContent>
  );
}

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
  const {
    wallet,
    getAllTokens,
    tokenState: { tokens },
  } = usePersistStore();

  const hasAnyWallet = !!wallet.address || hasTurnkeyWallet === true;
  // Still resolving whether an authed user has a wallet — keep the skeleton so we
  // don't flash the "get started" picker at someone who actually has one.
  const walletChecking = !!user && !wallet.address && hasTurnkeyWallet === null;

  const savingsValue = savingsUsd;
  const earnings = savings.earnings;
  const savingsLoading = savings.vaultLoading || savings.positionLoading;

  const stellarBalance = useMemo(
    () =>
      tokens
        .reduce(
          (acc, tkn) => acc.plus(BigNumber(tkn.balance).multipliedBy(tkn.price)),
          BigNumber(0)
        )
        .toNumber(),
    [tokens]
  );

  // Native (non-Stellar) chain tokens with a balance — BTC, ETH, SOL
  const nativeTokens = useMemo(
    () =>
      (['BTC', 'ETH', 'SOL'].map(getAsset) as (PortfolioAsset | undefined)[])
        .filter(
          (a): a is PortfolioAsset => !!a && a.balance != null && BigNumber(a.balance).gt(0)
        )
        .map(portfolioAssetToToken),
    [getAsset]
  );

  const nativeValue = useMemo(
    () =>
      nativeTokens.reduce(
        (acc, tkn) => acc + BigNumber(tkn.balance).multipliedBy(tkn.price).toNumber(),
        0
      ),
    [nativeTokens]
  );

  // "Wallet" = everything the user holds outside of savings, on any chain
  const walletBalance = stellarBalance + nativeValue;
  const totalBalance = walletBalance + savingsValue;

  const holdingsWithBalance = useMemo(
    () => tokens.filter((tkn) => BigNumber(tkn.balance).gt(0)),
    [tokens]
  );

  const holdingsData: HoldingData[] = useMemo(() => {
    const entries: HoldingData[] = holdingsWithBalance.map((tkn) => ({
      token: tkn,
      value: BigNumber(tkn.balance).multipliedBy(tkn.price).toNumber(),
      percentage:
        totalBalance > 0
          ? BigNumber(tkn.balance)
              .multipliedBy(tkn.price)
              .dividedBy(totalBalance)
              .multipliedBy(100)
              .toNumber()
          : 0,
    }));

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

    nativeTokens.forEach((tkn) => {
      const value = BigNumber(tkn.balance).multipliedBy(tkn.price).toNumber();
      entries.push({
        token: tkn,
        value,
        percentage: totalBalance > 0 ? (value / totalBalance) * 100 : 0,
      });
    });

    return entries.sort((a, b) => b.value - a.value);
  }, [holdingsWithBalance, totalBalance, savingsValue, nativeTokens]);

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
        loading={savingsLoading}
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

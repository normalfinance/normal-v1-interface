'use client';

import { BigNumber } from 'bignumber.js';
import { logger } from '@normalfinance/utils';
import { useMemo, useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import SavingsCard from '@/components/_common/savings-card';
import { BitcoinReceiveModal } from '@/components/_common/bitcoin-receive-modal';

import { HeroCard } from './portfolio-hero-card';
import { HoldingsCard } from './portfolio-holdings-card';
import { ActivityCard } from './portfolio-activity-card';

import type { HoldingData } from './_shared';

export default function PortfolioView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { user } = useSupabaseAuth();
  const { btcToken, bitcoinAddress } = useBtcPortfolio(!!user);
  const [btcReceiveOpen, setBtcReceiveOpen] = useState(false);

  const { setGlobalIsLoading } = useAppStore();
  const {
    wallet,
    getAllTokens,
    tokenState: { tokens },
  } = usePersistStore();

  const { userPosition, fetching, positionFetching } = useDefindexSavings();

  const savingsValue = useMemo(() => {
    const v = parseFloat(userPosition?.currentValue || '0');
    return v > 0 ? v : 0;
  }, [userPosition]);

  const earnings = useMemo(() => parseFloat(userPosition?.earnings || '0'), [userPosition]);

  const walletBalance = useMemo(
    () =>
      tokens
        .reduce(
          (acc, tkn) => acc.plus(BigNumber(tkn.balance).multipliedBy(tkn.price)),
          BigNumber(0)
        )
        .toNumber(),
    [tokens]
  );

  const btcValue = useMemo(
    () => btcToken ? BigNumber(btcToken.balance).multipliedBy(btcToken.price).toNumber() : 0,
    [btcToken]
  );

  const totalBalance = walletBalance + savingsValue + btcValue;

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

    if (btcToken) {
      entries.push({
        token: btcToken,
        value: btcValue,
        percentage: totalBalance > 0 ? (btcValue / totalBalance) * 100 : 0,
      });
    }

    return entries.sort((a, b) => b.value - a.value);
  }, [holdingsWithBalance, totalBalance, savingsValue, btcToken, btcValue]);

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
        loading={fetching || positionFetching}
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
          hasBitcoinWallet={!!bitcoinAddress}
          onBtcReceive={bitcoinAddress ? () => setBtcReceiveOpen(true) : undefined}
        />
        <SavingsCard sx={{ minWidth: 0, overflow: 'hidden' }} />
      </Box>

      <Box sx={{ mt: '20px' }}>
        <ActivityCard walletAddress={wallet.address} bitcoinAddress={bitcoinAddress} />
      </Box>

      <BitcoinReceiveModal
        open={btcReceiveOpen}
        address={bitcoinAddress}
        onClose={() => setBtcReceiveOpen(false)}
      />
    </DashboardContent>
  );
}

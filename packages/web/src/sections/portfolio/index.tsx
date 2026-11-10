'use client';

import type { PortfolioAsset } from '@/types/portfolio';

import { BigNumber } from 'bignumber.js';
import { cdn } from '@normalfinance/utils';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useMemo, useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { useTurnkeyWallet } from '@/hooks/use-turnkey-wallet';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { INK, FAINT, MUTED, PAPER, CANVAS } from '@/theme/brand-colors';
import { assetDisplay, connectedWalletLabel, portfolioAssetToToken } from '@/lib/portfolio/display';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import { TwoFactorPrompt } from '@/components/_common/two-factor-prompt';
import { GetStartedPicker } from '@/components/_common/get-started-picker';

import { MoneyBlock } from './portfolio-money';
import { BalanceBlock } from './portfolio-balance';
import { ActivityCard } from './portfolio-activity-card';

import type { HoldingData } from './_shared';
// Shown until we know whether the user even has a wallet. Beyond that each
// card owns its own skeleton, so a slow source never blanks the whole page.
function PortfolioSkeleton() {
  return (
    <DashboardContent>
      {/* The balance, the four tiles, then the assets: Home's own shape. */}
      <Skeleton variant="text" sx={{ width: 120, fontSize: 14 }} />
      <Skeleton variant="text" sx={{ width: 240, fontSize: 44 }} />
      <Skeleton variant="rectangular" sx={{ mt: 2.5, height: { xs: 68, md: 72 } }} />
      <Skeleton variant="rectangular" sx={{ mt: { xs: 3, md: 5 }, height: 360 }} />
    </DashboardContent>
  );
}

export default function PortfolioView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { user, isLoading: authLoading } = useSupabaseAuth();
  // Single source of truth for all balances + savings.
  const {
    getAsset,
    savings,
    savingsUsd,
    wallet: walletBalances,
    isLoading: balancesLoading,
  } = usePortfolio(!!user);
  const bitcoinAddress = getAsset('BTC')?.address ?? null;
  const ethereumAddress = getAsset('ETH')?.address ?? null;
  const solanaAddress = getAsset('SOL')?.address ?? null;
  // "Has any wallet" — a Stellar Normal wallet OR a Turnkey chain wallet. Flips
  // reactively when a wallet is provisioned (refetchAddresses). `null` = still
  // checking, so we don't flash the picker at an existing user.
  const { hasWallet: hasTurnkeyWallet } = useTurnkeyWallet(!!user);

  const { wallet } = usePersistStore();

  const hasAnyWallet = !!wallet.address || hasTurnkeyWallet === true;
  // Still resolving whether an authed user has a wallet — keep the skeleton so we
  // don't flash the "get started" picker at someone who actually has one.
  const walletChecking = !!user && !wallet.address && hasTurnkeyWallet === null;

  const savingsValue = savingsUsd;
  // Companion loading included: savings load like any other asset — the
  // skeleton holds until EVERY source has answered.
  const savingsLoading =
    savings.vaultLoading || savings.positionLoading || savings.companionPositionLoading;

  // True once balances AND savings have both resolved at least once. Used to
  // gate first-paint skeletons without letting later refetches re-trigger them.
  const [firstPaintDone, setFirstPaintDone] = useState(false);
  useEffect(() => {
    if (!balancesLoading && !savings.positionLoading && !savings.companionPositionLoading)
      setFirstPaintDone(true);
  }, [balancesLoading, savings.positionLoading, savings.companionPositionLoading]);
  // Doc 117: same cap as the landing hero (doc 116). companionPositionLoading
  // is deliberately sticky (data === undefined, so error-retry gaps never
  // flash $0) — but a permanently dead companion lookup then held this page's
  // skeletons forever, crypto rows included. After 8s, paint what we have.
  useEffect(() => {
    const id = setTimeout(() => setFirstPaintDone(true), 8_000);
    return () => clearTimeout(id);
  }, []);

  // ONE source for every chain, including XLM/USDC.
  //
  // This page used to read Stellar assets from the persisted token store while
  // the home hero and the account drawer read them from the portfolio
  // aggregator. Two paths for the same two assets meant every loading bug had
  // to be fixed twice and this page always lagged behind the others. The token
  // list is exactly XLM + USDC on mainnet (Blend USDC on testnet) — the same
  // assets the aggregator returns — so there is nothing to lose by unifying.
  const walletTokens = useMemo(() => {
    // #32: this page is the ACCOUNT-WIDE view (doc 72 §4f). On a hybrid
    // account EVERY row is labeled by its owning wallet — the slot wallet's
    // Stellar assets carry the external wallet's name, BTC/ETH/SOL and the
    // companion's XLM/USDC carry "Normal wallet" — so it is always clear
    // which wallet's money each number is. Single-wallet users see no labels.
    const hybrid = !!walletBalances.companionStellar;
    const connLabel = connectedWalletLabel(wallet.walletType);
    const slot = (
      ['XLM', 'USDC', 'BTC', 'ETH', 'SOL'].map(getAsset) as (PortfolioAsset | undefined)[]
    )
      .filter((a): a is PortfolioAsset => !!a && a.balance != null && BigNumber(a.balance).gt(0))
      .map((a) => {
        const tkn = portfolioAssetToToken(a);
        if (!hybrid) return tkn;
        const owner = a.chain === 'stellar' ? connLabel : 'Normal wallet';
        return { ...tkn, name: `${assetDisplay(a.symbol).name} · ${owner}` };
      });
    // Distinct contract ids keep React keys + row identity collision-free.
    const companion = (walletBalances.companionStellar?.assets ?? [])
      .filter((a) => a.balance != null && BigNumber(a.balance).gt(0))
      .map((a) => ({
        ...portfolioAssetToToken(a),
        contract: `__companion_${a.symbol.toLowerCase()}__`,
        name: `${assetDisplay(a.symbol).name} · Normal wallet`,
      }));
    return [...slot, ...companion];
  }, [getAsset, walletBalances.companionStellar, wallet.walletType]);

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

  // The wallet's move over the last 24 hours, from each asset's price change:
  // value × pct / (100 + pct) is what the asset was worth less a day ago.
  // Read from the portfolio rows: the token conversion drops change24h.
  const { change24h, changes } = useMemo(() => {
    const rows = [
      ...(['XLM', 'USDC', 'BTC', 'ETH', 'SOL'].map(getAsset) as (PortfolioAsset | undefined)[]),
      ...(walletBalances.companionStellar?.assets ?? []),
    ].filter((a): a is PortfolioAsset => !!a);
    const bySymbol: Record<string, number | null> = {};
    let delta = 0;
    let known = false;
    rows.forEach((a) => {
      bySymbol[a.symbol] = a.change24h;
      const value = BigNumber(a.balance ?? 0)
        .multipliedBy(a.price ?? 0)
        .toNumber();
      if (a.change24h == null || !Number.isFinite(a.change24h) || !(value > 0)) return;
      known = true;
      delta += (value * a.change24h) / (100 + a.change24h);
    });
    return { change24h: known ? delta : null, changes: bySymbol };
  }, [getAsset, walletBalances.companionStellar]);

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
          icon: cdn('/logo/logo-single.png'),
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

  // #75 round 2A: hybrid → one Holdings TAB per wallet (Niko's preference,
  // same pills as the drawer). Row identity by contract: slot Stellar tokens
  // keep their real contracts; everything Turnkey-side is synthetic
  // (`__btc__`, `__companion_*__`, `__savings__`) — so "starts with __" IS
  // the Normal-wallet side. Savings (account product) rides the Normal tab.
  const holdingsSections = useMemo(() => {
    if (!walletBalances.companionStellar) return undefined;
    const normal = holdingsData.filter((h) => h.token.contract.startsWith('__'));
    const external = holdingsData.filter((h) => !h.token.contract.startsWith('__'));
    return [
      { label: 'Normal wallet', data: normal },
      { label: connectedWalletLabel(wallet.walletType), data: external },
    ];
  }, [holdingsData, walletBalances.companionStellar, wallet.walletType]);

  if (!mounted || authLoading || walletChecking) {
    return <PortfolioSkeleton />;
  }

  // Signed out means the sign-in screen, whatever the browser remembers: the
  // persisted wallet slot can still hold an address after a sign-out (or while
  // a login waits for its 2FA code), and showing that wallet's savings to a
  // signed-out visitor is the bug Niko hit on 2026-11-03.
  if (!user || !hasAnyWallet) {
    // Signed in but no wallet yet (e.g. skipped the asset picker) → let them pick
    // an asset here instead of a dead-end "Sign in". Not signed in → sign in.
    if (user) {
      return (
        <DashboardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: { xs: 4, md: 7 } }}>
            <Box sx={{ width: '100%', maxWidth: 460, bgcolor: PAPER }}>
              <GetStartedPicker />
            </Box>
          </Box>
        </DashboardContent>
      );
    }

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
              bgcolor: CANVAS,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: FAINT,
            }}
          >
            <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Box sx={{ fontSize: '16px', fontWeight: 500, color: INK, mb: '6px' }}>
              Connect your wallet
            </Box>
            <Box sx={{ fontSize: '14px', color: MUTED, maxWidth: 280 }}>
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
              borderRadius: 'var(--radius-md)',
              border: 'none',
              bgcolor: INK,
              color: PAPER,
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
    <DashboardContent>
      <TwoFactorPrompt hasFunds={totalBalance > 0} />

      {/* No greeting and no date (Niko 2026-11-09): the balance first, then
          the assets right under it, on the first screen of a phone. */}
      <BalanceBlock
        total={totalBalance}
        change={change24h}
        // The totals sum BOTH sources, native-chain balances and the Stellar
        // token store; gated on the capped first paint (doc 117), so a stuck
        // companion lookup can't spin the balance forever.
        loading={!firstPaintDone && (savingsLoading || balancesLoading)}
        error={!!walletBalances.error}
        onRetry={() => walletBalances.refresh()}
      />

      <Box
        sx={{
          display: 'grid',
          // One column at every width (Niko 2026-11-09): your money across the
          // page, with room for each coin's price and share, then the activity.
          gridTemplateColumns: 'minmax(0, 1fr)',
          alignItems: 'start',
          gap: 4,
          mt: { xs: 3, md: 5 },
        }}
      >
        <MoneyBlock
          holdings={holdingsData}
          sections={holdingsSections}
          changes={changes}
          // Savings is one of the rows, so the list waits for it too, on the
          // FIRST paint only: a background refetch must never flash it back.
          loading={!firstPaintDone && (balancesLoading || savings.positionLoading)}
          error={!!walletBalances.error}
          onRetry={() => walletBalances.refresh()}
        />
        <ActivityCard
          limit={5}
          title="Recent activity"
          walletAddress={wallet.address}
          bitcoinAddress={bitcoinAddress}
          ethereumAddress={ethereumAddress}
          solanaAddress={solanaAddress}
        />
      </Box>
    </DashboardContent>
  );
}

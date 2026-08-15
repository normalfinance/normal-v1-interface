'use client';

import type { Position, PositionStatus, PortfolioAsset } from '@/types/portfolio';

import { useMemo } from 'react';
import { cdn } from '@normalfinance/utils';
import { assetDisplay } from '@/lib/portfolio/display';

import { useWalletBalances } from './use-wallet-balances';
import { useSavingsPosition } from './use-savings-position';

import type { UseWalletBalancesResult } from './use-wallet-balances';
import type { UseSavingsPositionResult } from './use-savings-position';

// ---------------------------------------------------------------------------
// THE portfolio data layer. Composes the fast wallet aggregator and the slow
// savings read into ONE unified holdings model, each position carrying its own
// async status. Every view reads this — none should fetch balances or savings
// directly. Sources stay independent (fast never waits on slow); the total is
// derived once, here, so views can never disagree.
//
// DISPLAY only — action-time freshness keeps its own live read.
// ---------------------------------------------------------------------------

const SAVINGS_ICON = cdn('logo/logo-single.png');

export interface UsePortfolioResult {
  /** Unified holdings (wallet assets with balance + savings if any). */
  positions: Position[];
  walletPositions: Position[];
  savingsPosition: Position | null;
  /** Raw wallet assets + lookup (back-compat for native-only consumers). */
  assets: PortfolioAsset[];
  getAsset: (symbol: string) => PortfolioAsset | undefined;
  /** Underlying source states (for detail UIs, e.g. savings APY/earnings). */
  wallet: UseWalletBalancesResult;
  savings: UseSavingsPositionResult;
  walletUsd: number;
  savingsUsd: number;
  totalUsd: number;
  /** True only on first wallet load with nothing cached to show. */
  isLoading: boolean;
  isValidating: boolean;
  refresh: () => void;
}

export function usePortfolio(enabled = true): UsePortfolioResult {
  const wallet = useWalletBalances(enabled);
  const savings = useSavingsPosition(enabled);

  const slotPositions = useMemo<Position[]>(
    () =>
      wallet.assets.map((a) => {
        const d = assetDisplay(a.symbol);
        return {
          id: `wallet:${a.symbol}`,
          kind: 'wallet' as const,
          symbol: a.symbol,
          name: d.name,
          iconUrl: d.icon,
          chain: a.chain,
          address: a.address,
          balance: a.balance,
          price: a.price,
          usdValue: a.usdValue,
          change24h: a.change24h,
          decimals: a.decimals,
          status: a.status as PositionStatus,
        };
      }),
    [wallet.assets]
  );

  // #32: savings DISPLAY is account-wide — the connected wallet's position
  // plus the companion Normal wallet's (one product, so a sum is honest).
  // Actions stay per-wallet inside the savings card, which reads
  // `savings.position` directly.
  const savingsDisplayValue = savings.value + savings.companionValue;

  const savingsPosition = useMemo<Position | null>(() => {
    if (!enabled) return null;
    const v = savingsDisplayValue;
    const status: PositionStatus = savings.positionLoading
      ? 'loading'
      : savings.positionError
        ? 'error'
        : 'ok';
    return {
      id: 'savings:usdc',
      kind: 'savings',
      symbol: 'Savings',
      name: 'Normal Savings',
      iconUrl: SAVINGS_ICON,
      balance: String(v),
      price: '1',
      usdValue: String(v),
      decimals: 4,
      status,
    };
  }, [enabled, savingsDisplayValue, savings.positionLoading, savings.positionError]);

  // #32: the companion Normal wallet's Stellar assets (present only when the
  // CONNECTED wallet is external). The portfolio page is the ACCOUNT-WIDE
  // total-wealth view (doc 72 §4f) — connecting an external wallet must never
  // make the Normal wallet's XLM/USDC vanish from the page (observed live
  // 2026-08-15). Rows carry a "· Normal wallet" label so no number pretends
  // to be spendable by the connected wallet.
  const companionPositions = useMemo<Position[]>(() => {
    const comp = wallet.companionStellar;
    if (!comp) return [];
    return comp.assets
      .filter((a) => a.balance != null && Number(a.balance) > 0)
      .map((a) => {
        const d = assetDisplay(a.symbol);
        return {
          id: `companion:${a.symbol}`,
          kind: 'wallet' as const,
          symbol: a.symbol,
          name: `${d.name} · Normal wallet`,
          iconUrl: d.icon,
          chain: a.chain,
          address: a.address,
          balance: a.balance,
          price: a.price,
          usdValue: a.usdValue,
          change24h: a.change24h,
          decimals: a.decimals,
          status: a.status as PositionStatus,
        };
      });
  }, [wallet.companionStellar]);

  // Account-wide wallet positions — what every consumer should render. The
  // slot wallet's assets plus the companion's (labeled). Companion rows carry
  // `companion:` ids so views can label or special-case them.
  const walletPositions = useMemo<Position[]>(
    () => [...slotPositions, ...companionPositions],
    [slotPositions, companionPositions]
  );

  // Positions shown to the user: wallet assets with a balance, plus savings when
  // there's value. (Holdings views filter to balance > 0 anyway.)
  const positions = useMemo<Position[]>(() => {
    // walletPositions already carries the companion rows (pre-filtered).
    const all = walletPositions.filter((p) => p.balance != null && Number(p.balance) > 0);
    if (savingsPosition && savingsDisplayValue > 0) all.push(savingsPosition);
    return all;
  }, [walletPositions, savingsPosition, savingsDisplayValue]);

  const companionUsd = companionPositions.reduce(
    (acc, p) => acc + (p.usdValue ? Number(p.usdValue) : 0),
    0
  );
  const walletUsd = wallet.totalUsd + companionUsd;
  const savingsUsd = savingsDisplayValue;
  const totalUsd = walletUsd + savingsUsd;

  return {
    positions,
    walletPositions,
    savingsPosition,
    assets: wallet.assets,
    getAsset: wallet.getAsset,
    wallet,
    savings,
    walletUsd,
    savingsUsd,
    totalUsd,
    isLoading: wallet.isLoading,
    isValidating: wallet.isValidating || savings.isValidating,
    refresh: () => {
      wallet.refresh();
      savings.refresh();
    },
  };
}

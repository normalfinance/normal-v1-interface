'use client';

import { usePortfolio } from '@/hooks/use-portfolio';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import { AppPageHeader } from '@/components/_common/brand';

import { ActivityCard } from '../portfolio/portfolio-activity-card';

// ----------------------------------------------------------------------

/** Every payment, swap and savings move across the user's wallets. */
export default function ActivityView() {
  const { user } = useSupabaseAuth();
  const { getAsset } = usePortfolio(!!user);
  const { wallet } = usePersistStore();

  return (
    <DashboardContent>
      <AppPageHeader
        title="Activity"
        subtitle="Payments, swaps and savings across all your wallets, newest first."
      />
      <ActivityCard
        walletAddress={wallet.address}
        bitcoinAddress={getAsset('BTC')?.address ?? null}
        ethereumAddress={getAsset('ETH')?.address ?? null}
        solanaAddress={getAsset('SOL')?.address ?? null}
      />
    </DashboardContent>
  );
}

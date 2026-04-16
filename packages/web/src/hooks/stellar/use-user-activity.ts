import type { Activity } from '@/types/activity';
import type { WalletActivityItem, WalletActivityResponse } from '@/types/wallet-activity';

import useSWR from 'swr';
import { getCryptoIconUrl } from '@normalfinance/utils';

function fallbackSymbol(address: string, stored: string | null): string {
  if (stored) return stored;
  if (address === 'native') return 'XLM';
  return address.length > 8 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

function mapWalletActivityItem(item: WalletActivityItem): Activity {
  const timestamp = Date.parse(item.createdAt);

  switch (item.kind) {
    case 'vault_deposit':
      return {
        id: item.id,
        timestamp,
        type: 'Savings Deposit',
        amount: item.amount,
        vaultAddress: item.vaultAddress,
        txHash: item.txHash,
      };
    case 'vault_withdraw':
      return {
        id: item.id,
        timestamp,
        type: 'Savings Withdraw',
        amount: item.amount,
        vaultAddress: item.vaultAddress,
        txHash: item.txHash,
      };
    case 'swap': {
      const symIn = fallbackSymbol(item.tokenInAddress, item.tokenInSymbol);
      const symOut = fallbackSymbol(item.tokenOutAddress, item.tokenOutSymbol);
      const aIn = parseFloat(item.amountIn);
      const aOut = parseFloat(item.amountOut);
      return {
        id: item.id,
        timestamp,
        type: 'Swap',
        tokenIn: {
          address: item.tokenInAddress,
          symbol: symIn,
          iconUrl: getCryptoIconUrl(symIn),
          amount: aIn,
        },
        tokenOut: {
          address: item.tokenOutAddress,
          symbol: symOut,
          iconUrl: getCryptoIconUrl(symOut),
          amount: aOut,
        },
      };
    }
  }
}

async function fetchWalletActivity(url: string): Promise<Activity[]> {
  const res = await fetch(url);
  const data: WalletActivityResponse = await res.json();
  if (!data.success || !data.items) {
    return [];
  }
  return data.items.map(mapWalletActivityItem);
}

export function useUserActivity(walletAddress: string | null | undefined): {
  recentActivity: Activity[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
} {
  const key =
    walletAddress && /^[GC][A-Z2-7]{55}$/.test(walletAddress)
      ? `/api/wallet/activity?walletAddress=${encodeURIComponent(walletAddress)}&limit=50`
      : null;

  const { data, error, isLoading, mutate } = useSWR<Activity[]>(key, fetchWalletActivity, {
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  });

  return {
    recentActivity: data ?? [],
    isLoading: Boolean(key) && isLoading,
    error,
    mutate,
  };
}

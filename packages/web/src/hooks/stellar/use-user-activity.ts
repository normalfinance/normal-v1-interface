import type { Activity } from '@/types/activity';
import type { WalletActivityItem, WalletActivityResponse } from '@/types/wallet-activity';

import useSWR from 'swr';
import { Horizon } from '@stellar/stellar-sdk';
import { listTransactions } from '@/lib/mgi/history';
import { constants, getCryptoIconUrl, cdn } from '@normalfinance/utils';

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
        txHash: item.txHash,
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
    default:
      throw new Error(`Unhandled activity kind: ${(item as WalletActivityItem).kind}`);
  }
}

const EXCLUDED_MGI_STATUSES = new Set(['incomplete', 'error', 'no_market', 'too_small', 'too_large', 'expired']);
const FEES_WALLET = 'GCVCVOJMNDX7DBYEN3YAJ2VWIHT4ZDUNSUFIRLHRQBKS7PXSTDRB4MWE';

async function fetchMgiActivity(): Promise<Activity[]> {
  try {
    const transactions = await listTransactions();
    return transactions
      .filter((tx) => !EXCLUDED_MGI_STATUSES.has(tx.status))
      .map((tx): Activity => {
        const timestamp = Date.parse(tx.completed_at ?? tx.updated_at ?? tx.started_at);
        const amount = parseFloat(tx.amount_out?.amount ?? tx.amount_in?.amount ?? '0');
        if (tx.kind === 'deposit') {
          return {
            id: `mgi:${tx.id}`,
            timestamp,
            type: 'Buy',
            symbol: 'USDC',
            iconUrl: getCryptoIconUrl('USDC'),
            amount,
            provider: 'MoneyGram',
          };
        }
        return {
          id: `mgi:${tx.id}`,
          timestamp,
          type: 'Sell',
          symbol: 'USDC',
          iconUrl: getCryptoIconUrl('USDC'),
          amount,
          provider: 'MoneyGram',
        };
      });
  } catch {
    return [];
  }
}

async function fetchStellarPayments(walletAddress: string): Promise<Activity[]> {
  try {
    const config = constants.StellarConfig;
    const server = new Horizon.Server(config.HORIZON_URL, {
      allowHttp: config.HORIZON_URL.startsWith('http://'),
    });

    const payments = await server
      .payments()
      .forAccount(walletAddress)
      .order('desc')
      .limit(100)
      .call();

    const activities: Activity[] = [];

    for (const record of payments.records) {
      if (record.type !== 'payment') continue;
      const p = record as Horizon.ServerApi.PaymentOperationRecord;

      const isNative = p.asset_type === 'native';
      const isUsdc = p.asset_code === 'USDC' && p.asset_issuer === config.USDC_ISSUER;
      if (!isNative && !isUsdc) continue;
      if (p.to === FEES_WALLET) continue;

      const symbol = isNative ? 'XLM' : 'USDC';
      const timestamp = Date.parse(p.created_at);
      const amount = parseFloat(p.amount);
      const isReceive = p.to === walletAddress;

      activities.push({
        id: `horizon:${p.id}`,
        timestamp,
        type: isReceive ? 'Receive' : 'Sent',
        address: isReceive ? p.from : p.to,
        txHash: (p as any).transaction_hash ?? null,
        token: {
          address: isNative ? 'native' : (p.asset_code ?? 'USDC'),
          symbol,
          iconUrl: getCryptoIconUrl(symbol),
          amount,
        },
      });
    }

    return activities;
  } catch {
    return [];
  }
}

async function fetchBtcActivity(bitcoinAddress: string): Promise<Activity[]> {
  try {
    const res = await fetch(`https://mempool.space/api/address/${bitcoinAddress}/txs`);
    if (!res.ok) return [];
    const txs: any[] = await res.json();

    const activities: Activity[] = [];

    for (const tx of txs) {
      const txid: string = tx.txid;
      const timestamp: number = tx.status?.confirmed
        ? (tx.status.block_time as number) * 1000
        : Date.now();

      const userInputs: any[] = tx.vin.filter(
        (v: any) => v.prevout?.scriptpubkey_address === bitcoinAddress
      );
      const nonUserOutputs: any[] = tx.vout.filter(
        (v: any) => v.scriptpubkey_address !== bitcoinAddress
      );
      const userOutputs: any[] = tx.vout.filter(
        (v: any) => v.scriptpubkey_address === bitcoinAddress
      );

      const isFromUser = userInputs.length > 0;
      const sentToOthers: number = nonUserOutputs.reduce((s: number, v: any) => s + v.value, 0);
      const receivedByUser: number = userOutputs.reduce((s: number, v: any) => s + v.value, 0);
      const btcIcon = cdn('tokens/bitcoin.webp');

      if (isFromUser && sentToOthers > 0) {
        activities.push({
          id: `btc:${txid}`,
          timestamp,
          type: 'Sent',
          address: nonUserOutputs[0]?.scriptpubkey_address ?? txid,
          txHash: txid,
          token: {
            address: '__btc__',
            symbol: 'BTC',
            iconUrl: btcIcon,
            amount: sentToOthers / 1e8,
          },
        });
      } else if (receivedByUser > 0) {
        const senderAddress = isFromUser
          ? bitcoinAddress
          : (tx.vin[0]?.prevout?.scriptpubkey_address ?? txid);
        activities.push({
          id: `btc:${txid}`,
          timestamp,
          type: 'Receive',
          address: senderAddress,
          txHash: txid,
          token: {
            address: '__btc__',
            symbol: 'BTC',
            iconUrl: btcIcon,
            amount: receivedByUser / 1e8,
          },
        });
      }
    }

    return activities;
  } catch {
    return [];
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

export function useUserActivity(
  walletAddress: string | null | undefined,
  bitcoinAddress?: string | null
): {
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

  const { data: mgiData } = useSWR<Activity[]>(
    walletAddress ? 'mgi-activity' : null,
    fetchMgiActivity,
    { revalidateOnFocus: true, dedupingInterval: 30_000 }
  );

  const { data: stellarData } = useSWR<Activity[]>(
    walletAddress ? ['stellar-payments', walletAddress] : null,
    ([, addr]) => fetchStellarPayments(addr as string),
    { revalidateOnFocus: true, dedupingInterval: 60_000 }
  );

  const { data: btcData } = useSWR<Activity[]>(
    bitcoinAddress ? ['btc-activity', bitcoinAddress] : null,
    ([, addr]) => fetchBtcActivity(addr as string),
    { revalidateOnFocus: true, dedupingInterval: 60_000 }
  );

  const recentActivity = [
    ...(data ?? []),
    ...(mgiData ?? []),
    ...(stellarData ?? []),
    ...(btcData ?? []),
  ].sort((a, b) => b.timestamp - a.timestamp);

  return {
    recentActivity,
    isLoading: Boolean(key) && isLoading,
    error,
    mutate,
  };
}

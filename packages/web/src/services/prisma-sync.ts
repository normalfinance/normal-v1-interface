import type { ReferralRow, VolumeDailyRow, LinkedWalletRow, WalletActivityRow, TransactionLogRow } from '@/lib/dune/tables';

import { prisma } from '@/lib/prisma';

const NETWORK = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';

// ---------------------------------------------------------------------------
// Swap volume + fee revenue grouped by day
// ---------------------------------------------------------------------------

export async function fetchSwapVolume(): Promise<VolumeDailyRow[]> {
  const swaps = await prisma.swapLog.findMany({
    select: { createdAt: true, amountIn: true, feeAmount: true },
    orderBy: { createdAt: 'asc' },
  });

  const byDay = new Map<string, { volume: number; fee: number; count: number }>();

  for (const swap of swaps) {
    const day = swap.createdAt.toISOString().slice(0, 10) + 'T00:00:00.000Z';
    const existing = byDay.get(day) ?? { volume: 0, fee: 0, count: 0 };
    existing.volume += Number(swap.amountIn ?? 0);
    existing.fee += Number(swap.feeAmount ?? 0);
    existing.count += 1;
    byDay.set(day, existing);
  }

  return Array.from(byDay.entries()).map(([date, d]) => ({
    date,
    type: 'swap' as const,
    network: NETWORK,
    volume_usd: d.volume,
    fee_usd: d.fee,
    tx_count: d.count,
  }));
}

// ---------------------------------------------------------------------------
// Active wallets from swaps + vault deposits grouped by day
// ---------------------------------------------------------------------------

export async function fetchWalletActivity(): Promise<WalletActivityRow[]> {
  const [swaps, deposits] = await Promise.all([
    prisma.swapLog.findMany({ select: { createdAt: true, walletAddress: true } }),
    prisma.vaultDeposit.findMany({ select: { createdAt: true, walletAddress: true, type: true } }),
  ]);

  const rows: WalletActivityRow[] = [];

  for (const s of swaps) {
    rows.push({
      date: s.createdAt.toISOString().slice(0, 10) + 'T00:00:00.000Z',
      wallet_address: s.walletAddress,
      activity_type: 'swap',
      network: NETWORK,
    });
  }

  for (const d of deposits) {
    rows.push({
      date: d.createdAt.toISOString().slice(0, 10) + 'T00:00:00.000Z',
      wallet_address: d.walletAddress,
      activity_type: d.type === 'deposit' ? 'onramp' : 'savings',
      network: NETWORK,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// All wallet addresses that have ever deposited (for yield snapshot queries)
// ---------------------------------------------------------------------------

export async function fetchAllDepositWallets(): Promise<string[]> {
  const results = await prisma.vaultDeposit.findMany({
    select: { walletAddress: true },
    distinct: ['walletAddress'],
  });
  return results.map((r) => r.walletAddress);
}

// ---------------------------------------------------------------------------
// Linked wallets (supabaseUid ↔ walletAddress mapping)
// ---------------------------------------------------------------------------

export async function fetchLinkedWallets(): Promise<LinkedWalletRow[]> {
  const wallets = await prisma.linkedWallet.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return wallets.map((w) => ({
    supabase_uid: w.supabaseUid,
    wallet_address: w.walletAddress,
    created_at: w.createdAt.toISOString(),
    last_used_at: w.lastUsedAt.toISOString(),
    network: NETWORK,
  }));
}

// ---------------------------------------------------------------------------
// Unified per-transaction log — one row per on-chain action through Normal
// ---------------------------------------------------------------------------

export async function fetchTransactionLog(): Promise<TransactionLogRow[]> {
  const [swaps, deposits] = await Promise.all([
    prisma.swapLog.findMany({
      select: {
        createdAt: true,
        walletAddress: true,
        tokenInSymbol: true,
        tokenOutSymbol: true,
        amountIn: true,
        amountOut: true,
        feeAmount: true,
        txHash: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.vaultDeposit.findMany({
      select: {
        createdAt: true,
        walletAddress: true,
        type: true,
        amount: true,
        feeAmount: true,
        txHash: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const rows: TransactionLogRow[] = [];

  for (const s of swaps) {
    rows.push({
      date: s.createdAt.toISOString(),
      wallet_address: s.walletAddress,
      action_type: 'swap',
      asset_in: s.tokenInSymbol ?? 'UNKNOWN',
      asset_out: s.tokenOutSymbol ?? 'UNKNOWN',
      amount: Number(s.amountIn ?? 0),
      fee_usd: Number(s.feeAmount ?? 0),
      tx_hash: s.txHash ?? '',
      network: NETWORK,
    });
  }

  for (const d of deposits) {
    const isDeposit = d.type === 'deposit';
    rows.push({
      date: d.createdAt.toISOString(),
      wallet_address: d.walletAddress,
      action_type: isDeposit ? 'savings_deposit' : 'savings_withdraw',
      asset_in: isDeposit ? 'USDC' : 'nUSDC',
      asset_out: isDeposit ? 'nUSDC' : 'USDC',
      amount: Number(d.amount ?? 0),
      fee_usd: Number(d.feeAmount ?? 0),
      tx_hash: d.txHash ?? '',
      network: NETWORK,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Referral activations
// ---------------------------------------------------------------------------

export async function fetchReferrals(): Promise<ReferralRow[]> {
  const actions = await prisma.referralAction.findMany({
    include: { referral: true },
    orderBy: { createdAt: 'asc' },
  });

  return actions.map((a) => ({
    date: a.createdAt.toISOString(),
    referral_code: a.referral.code,
    referee_wallet: a.userId,
    action: a.action,
    network: NETWORK,
  }));
}

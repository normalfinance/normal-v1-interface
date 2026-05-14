import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';
import { isValidStellarAddress } from '@/utils/stellar-address';

export const dynamic = 'force-dynamic';

const DECIMALS = 1e7;

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const network = cookieStore.get('normal-network')?.value ?? 'testnet';
    const isMainnet = network === 'mainnet';

    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user');

    if (!userAddress || !isValidStellarAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Valid user address required' },
        { status: 400 }
      );
    }

    const sdk = new DefindexSDK({
      apiKey: process.env.DEFINDEX_API_KEY,
      defaultNetwork: isMainnet ? SupportedNetworks.MAINNET : SupportedNetworks.TESTNET,
    });

    const VAULT_ADDRESS = isMainnet
      ? process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT || ''
      : process.env.NEXT_PUBLIC_TESTNET_DEFINDEX_VAULT || '';

    if (!VAULT_ADDRESS) {
      return NextResponse.json(
        { success: false, error: 'Vault address not configured' },
        { status: 500 }
      );
    }

    // Fetch on-chain balance and DB records in parallel.
    // Balance is allowed up to 25 s — Soroban RPC calls can be slow on mainnet.
    const [balanceResult, depositRecords] = await Promise.allSettled([
      withTimeout(sdk.getVaultBalance(VAULT_ADDRESS, userAddress), 25_000, 'getVaultBalance'),
      prisma.vaultDeposit.findMany({
        where: { walletAddress: userAddress, vaultAddress: VAULT_ADDRESS },
        select: { type: true, amount: true },
      }),
    ]);

    if (balanceResult.status === 'rejected') {
      console.error('[user-position] getVaultBalance failed:', String(balanceResult.reason));
    } else {
      console.log('[user-position] raw balance:', JSON.stringify(balanceResult.value));
    }

    // Parse on-chain balance (handle both number and string entries)
    let underlyingValue = 0;
    let dfTokens = 0;
    if (balanceResult.status === 'fulfilled' && balanceResult.value) {
      const b = balanceResult.value;
      underlyingValue = Array.isArray(b.underlyingBalance)
        ? b.underlyingBalance.reduce((s: number, v: any) => s + (Number(v) || 0), 0) / DECIMALS
        : (Number(b.underlyingBalance) || 0) / DECIMALS;
      dfTokens = Number(b.dfTokens) || 0;
    }

    // Compute total deposited from DB records
    const records =
      depositRecords.status === 'fulfilled' ? depositRecords.value : [];
    let totalDeposited: number;
    if (records.length === 0) {
      totalDeposited = underlyingValue;
    } else {
      totalDeposited = records.reduce(
        (sum: number, r: { type: string; amount: string }) =>
          r.type === 'deposit' ? sum + (parseFloat(r.amount) || 0) : sum - (parseFloat(r.amount) || 0),
        0
      );
      if (totalDeposited < 0) totalDeposited = 0;
    }

    // If on-chain balance is unavailable (RPC failed or returned 0 with no dfTokens),
    // return null so the client preserves its cached position — including real earnings —
    // rather than overwriting them with computed zeros.
    if (underlyingValue === 0 && dfTokens === 0) {
      if (records.length === 0) {
        console.warn('[user-position] No data available for', userAddress);
      } else {
        console.warn('[user-position] On-chain balance unavailable, preserving client cache for', userAddress);
      }
      return NextResponse.json({ success: true, userPosition: null });
    }

    // Stale Soroban guard: if DB records show significantly more deposited than
    // Soroban is reporting, a recent deposit hasn't propagated to all RPC nodes yet.
    // Return null so the client keeps its (correct) cached position rather than
    // reverting to the pre-deposit balance.
    if (records.length > 0 && underlyingValue > 0 && underlyingValue < totalDeposited * 0.95) {
      console.warn('[user-position] Stale Soroban data detected (underlyingValue < 95% of totalDeposited), preserving cache for', userAddress);
      return NextResponse.json({ success: true, userPosition: null });
    }

    const effectiveCurrentValue = underlyingValue > 0 ? underlyingValue : totalDeposited;
    const earnings = Math.max(effectiveCurrentValue - totalDeposited, 0);

    const userPosition = {
      shares: (dfTokens / DECIMALS).toString(),
      currentValue: effectiveCurrentValue.toString(),
      totalDeposited: totalDeposited.toString(),
      earnings: earnings.toString(),
    };

    console.log('[user-position] computed:', userPosition);

    return NextResponse.json({ success: true, userPosition });
  } catch (error) {
    console.error('[user-position] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user position' },
      { status: 500 }
    );
  }
}

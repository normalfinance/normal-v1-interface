import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';
import { isValidStellarAddress } from '@/utils/stellar-address';

export const dynamic = 'force-dynamic';

const DECIMALS = 1e7;
const DEFINDEX_API_BASE = 'https://api.defindex.io';

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);

// ----------------------------------------------------------------------

function parseEventAmount(event: any): number {
  // Try common field patterns — log shape on first unknown
  const raw =
    event.amount ??
    event.assetAmount ??
    event.assets?.[0]?.amount ??
    event.underlyingAmount ??
    0;
  return Number(raw) || 0;
}

function computeTotalDepositedFromEvents(events: any[]): number | null {
  if (!Array.isArray(events) || events.length === 0) return null;
  let total = 0;
  for (const event of events) {
    const type: string = (event.eventType ?? event.type ?? '').toLowerCase();
    const amount = parseEventAmount(event) / DECIMALS;
    if (type === 'deposit') {
      total += amount;
    } else if (type === 'withdraw') {
      total -= amount;
    }
    // transfer_in / transfer_out intentionally ignored for deposits calc
  }
  return Math.max(total, 0);
}

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const network = cookieStore.get('normal-network')?.value ?? 'testnet';
    const isMainnet = network === 'mainnet';
    const networkParam = isMainnet ? 'mainnet' : 'testnet';

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

    // Fetch balance, on-chain events, and DB records in parallel.
    // Events are the authoritative source for totalDeposited; DB is the fallback.
    const [balanceResult, eventsResult, depositRecords] = await Promise.allSettled([
      withTimeout(sdk.getVaultBalance(VAULT_ADDRESS, userAddress), 25_000, 'getVaultBalance'),
      withTimeout(
        fetch(
          `${DEFINDEX_API_BASE}/account/${userAddress}/vault/${VAULT_ADDRESS}/events?network=${networkParam}&limit=200`,
          {
            headers: {
              Authorization: `Bearer ${process.env.DEFINDEX_API_KEY ?? ''}`,
              'Content-Type': 'application/json',
            },
          }
        ).then((r) => r.json()),
        15_000,
        'getAccountEvents'
      ),
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

    if (eventsResult.status === 'rejected') {
      console.error('[user-position] getAccountEvents failed:', String(eventsResult.reason));
    } else {
      const raw = eventsResult.value;
      const sample = Array.isArray(raw) ? raw[0] : raw?.events?.[0];
      console.log('[user-position] events sample:', JSON.stringify(sample));
    }

    // Parse on-chain balance
    let underlyingValue = 0;
    let dfTokens = 0;
    if (balanceResult.status === 'fulfilled' && balanceResult.value) {
      const b = balanceResult.value;
      underlyingValue = Array.isArray(b.underlyingBalance)
        ? b.underlyingBalance.reduce((s: number, v: any) => s + (Number(v) || 0), 0) / DECIMALS
        : (Number(b.underlyingBalance) || 0) / DECIMALS;
      dfTokens = Number(b.dfTokens) || 0;
    }

    // If on-chain balance is zero with no dfTokens, user has no position.
    // Return null so the client preserves its cached position.
    if (underlyingValue === 0 && dfTokens === 0) {
      const records = depositRecords.status === 'fulfilled' ? depositRecords.value : [];
      if (records.length === 0) {
        console.warn('[user-position] No data available for', userAddress);
      } else {
        console.warn('[user-position] On-chain balance unavailable, preserving client cache for', userAddress);
      }
      return NextResponse.json({ success: true, userPosition: null });
    }

    // Compute totalDeposited — prefer DeFindex events (authoritative on-chain history)
    // over our DB records (which can miss entries if log-transaction fails).
    let totalDeposited: number;

    if (eventsResult.status === 'fulfilled') {
      const raw = eventsResult.value;
      const events: any[] = Array.isArray(raw) ? raw : (raw?.events ?? []);
      const fromEvents = computeTotalDepositedFromEvents(events);
      if (fromEvents !== null) {
        totalDeposited = fromEvents;
        console.log('[user-position] totalDeposited from events:', totalDeposited);
      } else {
        // Events API returned empty — fall back to DB
        const records = depositRecords.status === 'fulfilled' ? depositRecords.value : [];
        totalDeposited = records.reduce(
          (sum: number, r: { type: string; amount: string }) =>
            r.type === 'deposit' ? sum + (parseFloat(r.amount) || 0) : sum - (parseFloat(r.amount) || 0),
          0
        );
        if (totalDeposited < 0) totalDeposited = 0;
        console.log('[user-position] totalDeposited from DB (events empty):', totalDeposited);
      }
    } else {
      // Events API failed — fall back to DB
      const records = depositRecords.status === 'fulfilled' ? depositRecords.value : [];
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
      console.log('[user-position] totalDeposited from DB (events failed):', totalDeposited);
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

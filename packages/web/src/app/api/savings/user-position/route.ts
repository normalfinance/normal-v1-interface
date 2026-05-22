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

function parseEventAmount(event: any): number {
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
    if (type === 'deposit') total += amount;
    else if (type === 'withdraw') total -= amount;
  }
  return Math.max(total, 0);
}

async function fetchAllEvents(
  walletAddress: string,
  vaultAddress: string,
  network: string,
  apiKey: string | undefined
): Promise<any[]> {
  const PAGE_SIZE = 200;
  const allEvents: any[] = [];
  let offset = 0;

  while (true) {
    const url = new URL(`${DEFINDEX_API_BASE}/account/${walletAddress}/vault/${vaultAddress}/events`);
    url.searchParams.set('network', network);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(offset));

    const res = await fetch(url.toString(), {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`DeFindex events API ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const events: any[] = data.events ?? [];
    allEvents.push(...events);

    const total: number = data.pagination?.total ?? events.length;
    offset += events.length;

    if (offset >= total || events.length < PAGE_SIZE) break;
  }

  return allEvents;
}

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const { searchParams } = new URL(request.url);
    const networkOverride = searchParams.get('network');
    const network = networkOverride ?? cookieStore.get('normal-network')?.value ?? 'testnet';
    const isMainnet = network === 'mainnet';

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

    const networkParam = isMainnet ? 'mainnet' : 'testnet';

    // Fetch on-chain balance, events, and DB records in parallel.
    const [balanceResult, eventsResult, depositRecords] = await Promise.allSettled([
      withTimeout(sdk.getVaultBalance(VAULT_ADDRESS, userAddress), 25_000, 'getVaultBalance'),
      withTimeout(
        fetchAllEvents(userAddress, VAULT_ADDRESS, networkParam, process.env.DEFINDEX_API_KEY),
        15_000,
        'fetchAllEvents'
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
      console.error('[user-position] fetchAllEvents failed:', String(eventsResult.reason));
    } else if (eventsResult.value.length > 0) {
      console.log('[user-position] events[0]:', JSON.stringify(eventsResult.value[0]));
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

    // totalDeposited: events API is authoritative; DB is fallback only
    const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
    const totalDepositedFromEvents = computeTotalDepositedFromEvents(events);

    let totalDeposited: number;
    if (totalDepositedFromEvents !== null) {
      totalDeposited = totalDepositedFromEvents;
      console.log('[user-position] totalDeposited from events:', totalDeposited);
    } else {
      // Fall back to DB
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
      console.log('[user-position] totalDeposited from DB fallback:', totalDeposited);
    }

    // If on-chain balance is unavailable and there are no events, return null
    // so the client preserves its cached position rather than overwriting with zeros.
    if (underlyingValue === 0 && dfTokens === 0) {
      if (events.length === 0) {
        console.warn('[user-position] No on-chain data available for', userAddress);
      } else {
        console.warn('[user-position] On-chain balance unavailable, preserving client cache for', userAddress);
      }
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

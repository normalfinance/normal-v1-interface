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

    // Fetch on-chain balance, events, DB records, and account position (lifetime earnings) in parallel.
    const [balanceResult, eventsResult, depositRecords, accountPositionResult] = await Promise.allSettled([
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
      withTimeout(
        fetch(
          `${DEFINDEX_API_BASE}/account/${userAddress}/vault/${VAULT_ADDRESS}?network=${networkParam}`,
          {
            headers: process.env.DEFINDEX_API_KEY
              ? { Authorization: `Bearer ${process.env.DEFINDEX_API_KEY}` }
              : {},
            next: { revalidate: 0 },
          }
        ).then(async (res) => {
          if (!res.ok) return null;
          const json = await res.json();
          const perf = json?.performance ?? {};
          const earned = perf.totalInterestEarned;
          const deposited = perf.totalDeposited;
          return {
            totalInterestEarned: earned != null ? Number(earned) / DECIMALS : null,
            totalDeposited: deposited != null ? Number(deposited) / DECIMALS : null,
          };
        }),
        10_000,
        'fetchAccountPosition'
      ),
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

    // Extract DeFindex account position data (authoritative source for totalDeposited and earnings).
    // Withdrawal amounts in the events API are recorded in vault shares, not USDC, which causes
    // computeTotalDepositedFromEvents to underestimate withdrawals when PPS > 1. The account
    // position API computes these values in USDC terms correctly.
    const accountPosition =
      accountPositionResult.status === 'fulfilled' ? accountPositionResult.value : null;

    if (accountPositionResult.status === 'rejected') {
      console.error('[user-position] fetchAccountPosition failed:', String(accountPositionResult.reason));
    } else {
      console.log('[user-position] accountPosition:', JSON.stringify(accountPosition));
    }

    const lifetimeEarnings = accountPosition?.totalInterestEarned ?? null;

    // totalDeposited: events API is authoritative; DB is fallback only.
    // NOTE: accountPosition.totalDeposited is NOT used here — the DeFindex API returns the
    // cumulative gross deposit total (all deposits ever, ignoring withdrawals), which is
    // wrong for display. Only totalInterestEarned from that endpoint is used (for earnings).
    const records = depositRecords.status === 'fulfilled' ? depositRecords.value : [];
    const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
    const totalDepositedFromEvents = computeTotalDepositedFromEvents(events);

    let totalDeposited: number;
    if (totalDepositedFromEvents !== null) {
      totalDeposited = totalDepositedFromEvents;
      console.log('[user-position] totalDeposited from events:', totalDeposited);
    } else {
      // Fall back to DB when events API returns nothing
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

    // If getVaultBalance failed (rejected), return null so the client preserves its cached
    // position rather than overwriting with zeros from a bad read.
    // Do NOT return null when the balance is a legitimate 0 (e.g. after a full withdrawal) —
    // in that case fall through and return a proper zero position so the UI shows 0s.
    if (balanceResult.status === 'rejected') {
      console.warn('[user-position] getVaultBalance failed, preserving client cache for', userAddress);
      return NextResponse.json({ success: true, userPosition: null });
    }

    const effectiveCurrentValue = underlyingValue > 0 ? underlyingValue : totalDeposited;

    // earnings: always derived from current position so it resets to 0 after a full withdrawal.
    // lifetimeEarnings (totalInterestEarned) is the all-time cumulative figure and is kept
    // separate — it survives withdrawals and is used for the "All Time Earnings" display.
    const earnings = Math.max(effectiveCurrentValue - totalDeposited, 0);

    const userPosition = {
      shares: (dfTokens / DECIMALS).toString(),
      currentValue: effectiveCurrentValue.toString(),
      totalDeposited: totalDeposited.toString(),
      earnings: earnings.toString(),
      ...(lifetimeEarnings != null && { lifetimeEarnings: lifetimeEarnings.toString() }),
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

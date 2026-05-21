import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';

export const dynamic = 'force-dynamic';

const DECIMALS = 1e7;
const DEFINDEX_API = 'https://api.defindex.io';

function defindexHeaders(): HeadersInit {
  return process.env.DEFINDEX_API_KEY
    ? { Authorization: `Bearer ${process.env.DEFINDEX_API_KEY}` }
    : {};
}

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);

// Recursively extracts a numeric value from any Soroban i128 / SDK shape.
function extractNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'bigint') return Number(val);
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return Number(val) || 0;
  if (Array.isArray(val)) return val.reduce((s: number, v: any) => s + extractNumber(v), 0);
  // Object: try every common field DeFindex has used
  const candidate =
    val.totalAmount ??
    val.total ??
    val.amount ??
    val.balance ??
    val.underlyingBalance ??
    val.idle ??
    val.invested;
  if (candidate !== undefined) return extractNumber(candidate);
  return 0;
}

function parseTotalManagedFunds(funds: any): number {
  if (Array.isArray(funds)) {
    return funds.reduce((sum: number, val: any) => sum + extractNumber(val), 0);
  }
  return extractNumber(funds);
}

// ----------------------------------------------------------------------

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = cookies();
    const networkOverride = _request.nextUrl.searchParams.get('network');
    const network = networkOverride ?? cookieStore.get('normal-network')?.value ?? 'testnet';
    const isMainnet = network === 'mainnet';
    const networkParam = isMainnet ? 'mainnet' : 'testnet';

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

    // Vault info, APY, and DeFindex history run in parallel.
    const [vaultInfoResult, apyResult, historyRes] = await Promise.all([
      withTimeout(sdk.getVaultInfo(VAULT_ADDRESS), 10_000, 'getVaultInfo'),
      withTimeout(sdk.getVaultAPY(VAULT_ADDRESS), 10_000, 'getVaultAPY'),
      withTimeout(
        fetch(
          `${DEFINDEX_API}/vault/${VAULT_ADDRESS}/history?network=${networkParam}&period=all&interval=daily`,
          { headers: defindexHeaders(), cache: 'no-store' }
        ),
        10_000,
        'defindex vault history'
      ),
    ]);

    // Log raw structure once so we can see what the SDK actually returns.
    console.log('[vault-info] raw totalManagedFunds:', JSON.stringify(vaultInfoResult.totalManagedFunds));

    const rawFunds = parseTotalManagedFunds(vaultInfoResult.totalManagedFunds);
    const totalDeposits = (rawFunds / DECIMALS).toString();

    // Prefer history API cumulative deposits; fall back to current TVL.
    let totalDeposited = totalDeposits;
    if (historyRes.ok) {
      try {
        const historyJson = await historyRes.json();
        console.log('[vault-info] history keys:', Object.keys(historyJson));

        // Try every known field path the DeFindex API has ever used.
        const m =
          historyJson.metrics ??
          historyJson.currentState ??
          historyJson.summary ??
          historyJson.data ??
          historyJson ??
          {};

        const raw = Number(
          m.totalDeposits ??
          m.cumulativeDeposits ??
          m.total_deposits ??
          m.cumulative_deposits ??
          m.deposited ??
          0
        );

        if (raw > 0) totalDeposited = (raw / DECIMALS).toString();
      } catch (e) {
        console.warn('[vault-info] history parse error:', e);
      }
    }

    console.log('[vault-info] totalDeposits (TVL):', totalDeposits, '| totalDeposited (cumulative):', totalDeposited);

    return NextResponse.json({
      success: true,
      vault: {
        address: VAULT_ADDRESS,
        name: vaultInfoResult.name || 'Normal Savings',
        symbol: vaultInfoResult.symbol,
        totalDeposits,
        totalDeposited,
        apy: apyResult.apy,
        asset: 'USDC',
        fees: vaultInfoResult.feesBps,
      },
    });
  } catch (error) {
    console.error('[vault-info] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get vault info' },
      { status: 500 }
    );
  }
}

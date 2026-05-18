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

// ----------------------------------------------------------------------

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = cookies();
    const network = cookieStore.get('normal-network')?.value ?? 'testnet';
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

    const totalDeposits = Array.isArray(vaultInfoResult.totalManagedFunds)
      ? (
          vaultInfoResult.totalManagedFunds.reduce(
            (sum: number, val: any) => sum + (Number(val) || 0),
            0
          ) / DECIMALS
        ).toString()
      : '0';

    // Cumulative total deposits through Normal from DeFindex history metrics.
    // Falls back to current TVL if the history API is unavailable or returns 0.
    let totalDeposited = totalDeposits;
    if (historyRes.ok) {
      const historyJson = await historyRes.json();
      const m = historyJson.metrics ?? historyJson.currentState ?? {};
      const raw = Number(m.totalDeposits ?? m.cumulativeDeposits ?? m.total_deposits ?? 0);
      if (raw > 0) totalDeposited = (raw / DECIMALS).toString();
    }

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

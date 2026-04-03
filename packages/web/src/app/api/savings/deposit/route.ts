import { NextRequest, NextResponse } from 'next/server';

import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';
import { isValidStellarAddress } from '@/utils/stellar-address';

// ----------------------------------------------------------------------

const sdk = new DefindexSDK({
  apiKey: process.env.DEFINDEX_API_KEY,
  defaultNetwork:
    process.env.NEXT_PUBLIC_NETWORK === 'MAINNET'
      ? SupportedNetworks.MAINNET
      : SupportedNetworks.TESTNET,
});

const VAULT_ADDRESS =
  process.env.NEXT_PUBLIC_NETWORK === 'MAINNET'
    ? process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT || ''
    : process.env.NEXT_PUBLIC_TESTNET_DEFINDEX_VAULT || '';

// ----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { amount, caller } = await request.json();

    if (amount === undefined || amount === null || amount === '' || !caller) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: amount, caller' },
        { status: 400 }
      );
    }

    const parsed = Number(amount);
    if (isNaN(parsed) || parsed <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (!isValidStellarAddress(caller)) {
      return NextResponse.json(
        { success: false, error: 'Invalid caller address format' },
        { status: 400 }
      );
    }

    if (!VAULT_ADDRESS) {
      return NextResponse.json(
        { success: false, error: 'Vault address not configured' },
        { status: 500 }
      );
    }

    // Convert human-readable amount to stroops (7 decimals for Stellar)
    const [whole = '0', frac = ''] = String(amount).split('.');
    const padded = frac.padEnd(7, '0').slice(0, 7);
    const amountInStroops = BigInt(whole) * 10_000_000n + BigInt(padded);

    const result = await sdk.depositToVault(VAULT_ADDRESS, {
      amounts: [Number(amountInStroops)],
      caller,
      invest: true,
      slippageBps: 100, // 1% slippage
    });

    if (!result.xdr) {
      return NextResponse.json(
        { success: false, error: 'DeFindex SDK did not return a transaction XDR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      xdr: result.xdr,
    });
  } catch (error: any) {
    console.error('Deposit error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to build deposit transaction' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';

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

    if (!amount || !caller) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: amount, caller' },
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
    const amountInStroops = Math.floor(parseFloat(amount) * 10_000_000);

    const result = await sdk.withdrawFromVault(VAULT_ADDRESS, {
      amounts: [amountInStroops],
      caller,
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
    console.error('Withdraw error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to build withdraw transaction' },
      { status: 500 }
    );
  }
}

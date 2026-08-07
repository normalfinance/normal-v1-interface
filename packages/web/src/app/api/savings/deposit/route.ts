import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';
import { isValidStellarAddress } from '@/utils/stellar-address';

// ----------------------------------------------------------------------

// Unauthenticated until 2026-08-07 (finding #50): any anonymous caller could
// drive this route — and with it, quota we pay for. Its only legitimate
// callers are signed-in app flows, which send auth headers.
export const POST = withAuth(async (request: NextRequest, { user }) => {
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const cookieStore = await cookies();
    const network = cookieStore.get('normal-network')?.value ?? 'testnet';
    const isMainnet = network === 'mainnet';

    const sdk = new DefindexSDK({
      apiKey: process.env.DEFINDEX_API_KEY,
      defaultNetwork: isMainnet ? SupportedNetworks.MAINNET : SupportedNetworks.TESTNET,
    });

    const VAULT_ADDRESS = isMainnet
      ? process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT || ''
      : process.env.NEXT_PUBLIC_TESTNET_DEFINDEX_VAULT || '';

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
    const amountInStroops = BigInt(whole) * BigInt(10_000_000) + BigInt(padded);

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
});

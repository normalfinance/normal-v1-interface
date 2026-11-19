import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { networkFromCookie } from '@/server/network-cookie';
import { withAuth, actionCodeRefusal } from '@/lib/with-auth';
import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';
import { vaultWithdrawOf } from '@/lib/stellar/vault-withdraw';
import { isValidStellarAddress } from '@/utils/stellar-address';
import { getStellarConfigForNetwork } from '@normalfinance/utils';
import { Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { inspectRateLimit, withRateLimitRetry } from '@/server/defindex';

// A cold savings load bursts ~5 DeFindex calls and their limit is per second;
// a user clicking deposit/withdraw right after page load could land inside
// that window and get DeFindex's raw "Rate limit exceeded" as a tech error
// (observed live 2026-08-12). The retry above self-heals the transient case;
// this message covers the rare double-429 in language a user can act on.
const BUSY_MESSAGE = 'Savings is busy for a moment. Please wait a few seconds and try again.';

// ----------------------------------------------------------------------

// Unauthenticated until 2026-08-07 (finding #50): any anonymous caller could
// drive this route — and with it, quota we pay for. Its only legitimate
// callers are signed-in app flows, which send auth headers.
export const POST = withAuth(async (request: NextRequest, { user, accessToken }) => {
  const refusal = actionCodeRefusal(user, accessToken);
  if (refusal) return refusal;
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const cookieStore = await cookies();
    const network = networkFromCookie(cookieStore);
    const isMainnet = network === 'mainnet';

    const sdk = new DefindexSDK({
      apiKey: process.env.DEFINDEX_API_KEY,
      defaultNetwork: isMainnet ? SupportedNetworks.MAINNET : SupportedNetworks.TESTNET,
    });

    const VAULT_ADDRESS = isMainnet
      ? process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT || ''
      : process.env.NEXT_PUBLIC_TESTNET_DEFINDEX_VAULT || '';

    const { amount, caller, slippageBps: askedSlippage } = await request.json();
    // Doc 129 Phase 5b: Savings → coin asks for a tight minimum (its USDC is
    // what Circle moves); everything else keeps 1%.
    const slippageBps =
      Number.isInteger(askedSlippage) && askedSlippage >= 10 && askedSlippage <= 100
        ? askedSlippage
        : 100;

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

    const result = await withRateLimitRetry(
      () =>
        sdk.withdrawFromVault(VAULT_ADDRESS, {
          amounts: [Number(amountInStroops)],
          caller,
          slippageBps,
        }),
      'withdrawFromVault'
    );

    if (!result.xdr) {
      return NextResponse.json(
        { success: false, error: 'DeFindex SDK did not return a transaction XDR' },
        { status: 500 }
      );
    }

    // Doc 129 Phase 5b: the minimum the vault guarantees to pay out, read from
    // the transaction itself (7-decimal units); null if it is not a plain
    // withdrawal of this vault.
    let minOut: string | null = null;
    try {
      const tx = TransactionBuilder.fromXDR(
        result.xdr,
        getStellarConfigForNetwork(network).NETWORK_PASSPHRASE
      );
      const call = tx instanceof Transaction ? vaultWithdrawOf(tx, VAULT_ADDRESS) : null;
      minOut = call && call.from === caller ? call.minOut.toString() : null;
    } catch {
      minOut = null;
    }

    return NextResponse.json({
      success: true,
      xdr: result.xdr,
      minOut,
    });
  } catch (error: any) {
    console.error('Withdraw error:', error);
    if (inspectRateLimit(error).isRateLimited) {
      return NextResponse.json({ success: false, error: BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          'The withdrawal could not be prepared, so nothing moved. Try again in a moment.',
      },
      { status: 500 }
    );
  }
});

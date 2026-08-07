import type { NextRequest } from 'next/server';
import type { NetworkType } from '@normalfinance/utils';

import { cookies } from 'next/headers';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { getStellarConfigForNetwork } from '@normalfinance/utils';
import {
  type FeeAssetCode,
  buildFeePaymentXdr,
  getFeesDepositAddress,
} from '@/lib/build-fee-payment';

// ----------------------------------------------------------------------

const VALID_ASSETS: FeeAssetCode[] = ['XLM', 'USDC'];

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
    const network = (cookieStore.get('normal-network')?.value ?? 'testnet') as NetworkType;
    const config = getStellarConfigForNetwork(network);

    const { caller, amount, assetCode, assetIssuer: clientAssetIssuer } = await request.json();

    if (!caller || !amount || !assetCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: caller, amount, assetCode' },
        { status: 400 }
      );
    }

    if (!VALID_ASSETS.includes(assetCode)) {
      return NextResponse.json(
        { success: false, error: `assetCode must be one of ${VALID_ASSETS.join(', ')}` },
        { status: 400 }
      );
    }

    const destination = getFeesDepositAddress();

    // USDC fees default to canonical USDC. The one exception — testnet
    // savings pays fees in Blend USDC — is handled by the caller passing
    // an explicit `assetIssuer`, which we validate against this network's
    // known USDC issuers to prevent fees being routed through arbitrary assets.
    let assetIssuer: string | undefined;
    if (assetCode === 'USDC') {
      const canonicalIssuer = config.USDC_ISSUER;
      const blendIssuer = config.BLEND_USDC_ISSUER;

      if (clientAssetIssuer) {
        if (clientAssetIssuer !== canonicalIssuer && clientAssetIssuer !== blendIssuer) {
          return NextResponse.json(
            {
              success: false,
              error: 'assetIssuer does not match a known USDC issuer for this network',
            },
            { status: 400 }
          );
        }
        assetIssuer = clientAssetIssuer;
      } else {
        assetIssuer = canonicalIssuer;
      }

      if (!assetIssuer) {
        return NextResponse.json(
          { success: false, error: 'USDC issuer is not configured for this network' },
          { status: 500 }
        );
      }
    }

    const xdr = await buildFeePaymentXdr({
      caller,
      destination,
      amount: String(amount),
      assetCode,
      assetIssuer,
      config,
    });

    return NextResponse.json({ success: true, xdr, destination });
  } catch (error: any) {
    console.error('[fees/build-payment] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to build fee payment' },
      { status: 500 }
    );
  }
});

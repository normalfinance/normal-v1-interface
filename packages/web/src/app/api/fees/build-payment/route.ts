import type { NextRequest} from 'next/server';

import { NextResponse } from 'next/server';
import { constants } from '@normalfinance/utils';
import {
  type FeeAssetCode,
  buildFeePaymentXdr,
  getFeesDepositAddress,
} from '@/lib/build-fee-payment';

// ----------------------------------------------------------------------

const VALID_ASSETS: FeeAssetCode[] = ['XLM', 'USDC'];

export async function POST(request: NextRequest) {
  try {
    const { caller, amount, assetCode } = await request.json();

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

    const assetIssuer =
      assetCode === 'USDC' ? constants.StellarConfig.USDC_ISSUER : undefined;

    if (assetCode === 'USDC' && !assetIssuer) {
      return NextResponse.json(
        { success: false, error: 'USDC issuer is not configured for this network' },
        { status: 500 }
      );
    }

    const xdr = await buildFeePaymentXdr({
      caller,
      destination,
      amount: String(amount),
      assetCode,
      assetIssuer,
    });

    return NextResponse.json({ success: true, xdr, destination });
  } catch (error: any) {
    console.error('[fees/build-payment] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to build fee payment' },
      { status: 500 }
    );
  }
}

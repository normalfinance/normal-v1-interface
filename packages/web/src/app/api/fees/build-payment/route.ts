import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getStellarConfigForNetwork, NetworkType } from '@normalfinance/utils';
import {
  type FeeAssetCode,
  buildFeePaymentXdr,
  getFeesDepositAddress,
} from '@/lib/build-fee-payment';

// ----------------------------------------------------------------------

const VALID_ASSETS: FeeAssetCode[] = ['XLM', 'USDC'];

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const network = (cookieStore.get('normal-network')?.value ?? 'testnet') as NetworkType;
    const config = getStellarConfigForNetwork(network);

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

    //TODO: need to fix this to accomodate swaps

    const assetIssuer =
      assetCode === 'USDC' ? config.BLEND_USDC_ISSUER : undefined;

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
}

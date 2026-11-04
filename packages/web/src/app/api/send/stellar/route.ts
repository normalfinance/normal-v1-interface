import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { networkFromCookie } from '@/server/network-cookie';
import { withAuth, actionCodeRefusal } from '@/lib/with-auth';
import { getStellarConfigForNetwork } from '@normalfinance/utils';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';

// ---------------------------------------------------------------------------
// Stellar sends go straight from the browser to Horizon, which leaves the
// server nowhere to ask for the 6-digit code. Accounts with 2FA send through
// here instead; everyone else keeps the direct path (lib/stellar/submit-send.ts).
//
// It only relays bytes the user already signed: it can't change or spend them
// and it writes no row, so unlike execute-pair it doesn't check wallet
// ownership. Connected wallets have no linked_wallets row, and turning on 2FA
// must not stop them sending.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
// Horizon holds the request until the ledger closes or it gives up.
export const maxDuration = 60;

export const POST = withAuth(async (request: NextRequest, { user, accessToken }) => {
  const refusal = actionCodeRefusal(user, accessToken);
  if (refusal) return refusal;

  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { signedXdr?: unknown } | null;
  const signedXdr = body?.signedXdr;
  if (typeof signedXdr !== 'string' || !signedXdr) {
    return NextResponse.json({ success: false, error: 'Missing signedXdr' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const config = getStellarConfigForNetwork(networkFromCookie(cookieStore));

  let transaction: ReturnType<typeof TransactionBuilder.fromXDR>;
  try {
    transaction = TransactionBuilder.fromXDR(signedXdr, config.NETWORK_PASSPHRASE);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid transaction' }, { status: 400 });
  }

  const horizon = new Horizon.Server(config.HORIZON_URL, {
    allowHttp: config.HORIZON_URL.startsWith('http://'),
  });
  try {
    const { hash } = await horizon.submitTransaction(transaction);
    return NextResponse.json({ success: true, hash });
  } catch (err: any) {
    const resultCodes = err?.response?.data?.extras?.result_codes;
    // No result codes means Horizon gave no verdict, so the send may still land.
    return NextResponse.json(
      { success: false, error: 'Transaction submission failed', resultCodes },
      { status: resultCodes ? 400 : 502 }
    );
  }
});

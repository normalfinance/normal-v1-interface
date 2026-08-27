import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { rateLimiter } from '@/server/rateLimiter';
import { userOwnsWallet } from '@/lib/wallet-ownership';
import { networkFromCookie } from '@/server/network-cookie';
import { getFeesDepositAddress } from '@/lib/build-fee-payment';
import { getStellarConfigForNetwork } from '@normalfinance/utils';
import { settleRecord, createPendingRecord } from '@/server/tx-records';
import { StrKey, Horizon, TransactionBuilder } from '@stellar/stellar-sdk';

// #33 Stage 1 — the single-transaction swap submit (embedded Soroswap fee).
// The #27 property is preserved: the SwapLog row is written 'pending' BEFORE
// the transaction is broadcast, then settled by outcome. No fee tx exists —
// the 0.5% rides inside this one transaction (referralId at build time).
export const dynamic = 'force-dynamic';

// Doc 95 Wave 2: hardcoded Horizon/passphrase maps ignored the network config
// every other Stellar path honours — the embedded-fee leg and the fee-pair leg
// could talk to different Horizons in one deployment. Use the shared config.

export const POST = withAuth(async (request: NextRequest, { user }) => {
  // Doc 95 Wave 2: this route broadcasts a signed transaction and writes a
  // money row — it needs the same ceiling as its sibling execute-pair.
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }
  try {
    const body = await request.json();
    const { signedXdr, record } = body ?? {};
    if (typeof signedXdr !== 'string' || !signedXdr) {
      return NextResponse.json({ success: false, error: 'Missing signedXdr' }, { status: 400 });
    }
    const cookieStore = await cookies();
    const network = networkFromCookie(cookieStore);
    const config = getStellarConfigForNetwork(network);

    // The tx's own SOURCE is the wallet of record — never trust a client
    // field for ownership (same rule as the fee-pair funnel).
    const tx = TransactionBuilder.fromXDR(signedXdr, config.NETWORK_PASSPHRASE);
    const walletAddress = 'source' in tx ? (tx as { source: string }).source : '';
    const serviceHash = tx.hash().toString('hex');

    // Doc 95 Wave 2: the source was READ from the signed tx but never checked
    // against the caller — an authenticated user could have us broadcast a
    // transaction signed by someone else's account and write a swap_logs row
    // against their wallet. execute-pair:236 has always done this check.
    if (!walletAddress || !(await userOwnsWallet(user.id, walletAddress))) {
      return NextResponse.json(
        { success: false, error: 'Wallet is not linked to your account' },
        { status: 403 }
      );
    }

    // Doc 95 Wave 2: this route exists ONLY for the embedded-fee (single
    // signature) path, where the 0.5% rides inside the swap transaction via
    // Soroswap's referralId. Nothing verified the fee was actually in there,
    // so a build that silently dropped it would broadcast a free swap.
    // VERIFIED 2026-08-27 against the live Soroswap build API: the referral
    // address appears in the XDR as its raw 32-byte ed25519 key.
    // Trade-off: if Soroswap ever changes that encoding this check fails
    // closed — the client's response is to fall back to its two-signature
    // fee-pair path, which is why the error is tagged.
    try {
      const feeKey = Buffer.from(StrKey.decodeEd25519PublicKey(getFeesDepositAddress()));
      if (!Buffer.from(signedXdr, 'base64').includes(feeKey)) {
        console.error('[swap/submit-single] fee address absent from the signed XDR — refusing');
        return NextResponse.json(
          {
            success: false,
            embedded_unavailable: true,
            error: 'Single-signature swap unavailable right now — using the standard flow',
          },
          { status: 409 }
        );
      }
    } catch (feeErr) {
      console.error('[swap/submit-single] fee verification could not run:', feeErr);
      return NextResponse.json(
        { success: false, embedded_unavailable: true, error: 'Single-signature swap unavailable' },
        { status: 409 }
      );
    }

    await createPendingRecord({
      input: {
        kind: 'swap',
        record: {
          tokenInAddress: String(record?.tokenInAddress ?? ''),
          tokenOutAddress: String(record?.tokenOutAddress ?? ''),
          tokenInSymbol: record?.tokenInSymbol ?? null,
          tokenOutSymbol: record?.tokenOutSymbol ?? null,
          amountIn: String(record?.amountIn ?? '0'),
          amountOut: String(record?.amountOut ?? '0'),
          // Embedded: the fee is part of the SAME tx, recorded for accounting.
          feeAmount: String(record?.feeAmount ?? '0'),
        },
      },
      walletAddress,
      network,
      serviceHash,
      feeHash: null,
    });

    const horizon = new Horizon.Server(config.HORIZON_URL, {
      allowHttp: config.HORIZON_URL.startsWith('http://'),
    });
    try {
      await horizon.submitTransaction(tx);
    } catch (submitErr: any) {
      const codes = submitErr?.response?.data?.extras?.result_codes;
      await settleRecord({
        kind: 'swap',
        serviceHash,
        status: 'failed',
        reason: codes ? JSON.stringify(codes) : String(submitErr?.message ?? submitErr),
      });
      return NextResponse.json(
        {
          success: false,
          error: codes
            ? `${codes.transaction ?? ''} ${(codes.operations ?? []).join(' ')}`.trim()
            : 'Transaction submission failed',
        },
        { status: 400 }
      );
    }

    await settleRecord({ kind: 'swap', serviceHash, status: 'confirmed' });
    return NextResponse.json({ success: true, hash: serviceHash });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message ?? e) }, { status: 500 });
  }
});

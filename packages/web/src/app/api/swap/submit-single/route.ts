import type { NextRequest } from 'next/server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';
import { settleRecord, createPendingRecord } from '@/server/tx-records';

// #33 Stage 1 — the single-transaction swap submit (embedded Soroswap fee).
// The #27 property is preserved: the SwapLog row is written 'pending' BEFORE
// the transaction is broadcast, then settled by outcome. No fee tx exists —
// the 0.5% rides inside this one transaction (referralId at build time).
export const dynamic = 'force-dynamic';

const HORIZON: Record<string, string> = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
};
const PASSPHRASE: Record<string, string> = {
  mainnet: 'Public Global Stellar Network ; September 2015',
  testnet: 'Test SDF Network ; September 2015',
};

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { signedXdr, record } = body ?? {};
    if (typeof signedXdr !== 'string' || !signedXdr) {
      return NextResponse.json({ success: false, error: 'Missing signedXdr' }, { status: 400 });
    }
    const cookieStore = await cookies();
    const network = (cookieStore.get('normal-network')?.value ?? 'testnet') as
      | 'mainnet'
      | 'testnet';

    // The tx's own SOURCE is the wallet of record — never trust a client
    // field for ownership (same rule as the fee-pair funnel).
    const tx = TransactionBuilder.fromXDR(signedXdr, PASSPHRASE[network]);
    const walletAddress = 'source' in tx ? (tx as { source: string }).source : '';
    const serviceHash = tx.hash().toString('hex');

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

    const horizon = new Horizon.Server(HORIZON[network]);
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

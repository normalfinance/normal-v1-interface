import type { NextRequest } from 'next/server';
import type { NetworkType } from '@normalfinance/utils';
import type { FeeEscrowKind, FeeEscrowEntry } from '@/server/fee-escrow';

import { cookies } from 'next/headers';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { userOwnsWallet } from '@/lib/wallet-ownership';
import { getFeesDepositAddress } from '@/lib/build-fee-payment';
import { getStellarConfigForNetwork } from '@normalfinance/utils';
import { Horizon, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { resolveEscrow, escrowFeePair, submitSignedXdr } from '@/server/fee-escrow';

// ---------------------------------------------------------------------------
// #26 fee ordering — the submit half of the sign-both-first design.
//
// The client arrives with BOTH transactions already signed: the service tx
// (savings deposit/withdraw or swap) and the Normal fee payment chained one
// sequence number behind it. Nothing has been submitted yet. This route:
//   1. validates the pair (same source, consecutive sequences, fee really
//      pays our fee address, both signed, sane timebounds),
//   2. escrows the pair in Redis BEFORE submitting anything — from that
//      moment the cron sweeper guarantees completion even if this
//      invocation, the client tab, or the network dies,
//   3. submits the service tx, and on success the fee tx.
//
// The wallet address comes from the signed txs themselves, and is checked
// against the authenticated user's wallets — this is not a relay for
// arbitrary transactions.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VALID_KINDS: FeeEscrowKind[] = ['savings_deposit', 'savings_withdraw', 'swap'];

// The fee window must have enough runway left for escrow retries to mean
// anything; the builder issues 15-minute windows, so this only rejects stale
// pairs the user sat on for ages before submitting.
const MIN_FEE_RUNWAY_MS = 60_000;

function parseSignedTx(xdr: unknown, passphrase: string, label: string): Transaction {
  if (typeof xdr !== 'string' || !xdr) {
    throw new Error(`Missing ${label} transaction`);
  }
  let tx;
  try {
    tx = TransactionBuilder.fromXDR(xdr, passphrase);
  } catch {
    throw new Error(`Invalid ${label} transaction XDR`);
  }
  if (!(tx instanceof Transaction)) {
    throw new Error(`${label} transaction must be a regular transaction, not a fee-bump`);
  }
  if (tx.signatures.length === 0) {
    throw new Error(`${label} transaction is not signed`);
  }
  return tx;
}

function formatResultCodes(resultCodes: unknown): string {
  const codes = resultCodes as { transaction?: string; operations?: string[] } | undefined;
  const parts = [codes?.transaction, ...(codes?.operations ?? [])].filter(Boolean);
  return parts.length ? parts.join(', ') : 'transaction rejected';
}

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const cookieStore = await cookies();
    const network = (cookieStore.get('normal-network')?.value ?? 'testnet') as NetworkType;
    const config = getStellarConfigForNetwork(network);

    const { serviceXdr, feeXdr, kind } = await request.json();

    if (!VALID_KINDS.includes(kind)) {
      return NextResponse.json(
        { success: false, error: `kind must be one of ${VALID_KINDS.join(', ')}` },
        { status: 400 }
      );
    }

    let serviceTx: Transaction;
    let feeTx: Transaction;
    try {
      serviceTx = parseSignedTx(serviceXdr, config.NETWORK_PASSPHRASE, 'service');
      feeTx = parseSignedTx(feeXdr, config.NETWORK_PASSPHRASE, 'fee');
    } catch (parseErr: any) {
      return NextResponse.json({ success: false, error: parseErr.message }, { status: 400 });
    }

    // The pair must be one account acting twice, back to back.
    if (serviceTx.source !== feeTx.source) {
      return NextResponse.json(
        { success: false, error: 'Service and fee transactions have different source accounts' },
        { status: 400 }
      );
    }
    if (BigInt(feeTx.sequence) !== BigInt(serviceTx.sequence) + 1n) {
      return NextResponse.json(
        { success: false, error: 'Fee transaction must directly follow the service transaction' },
        { status: 400 }
      );
    }

    // The fee tx must be exactly what it claims: one payment to Normal's fee
    // address. Anything else does not belong in this escrow.
    const feeOps = feeTx.operations;
    if (feeOps.length !== 1 || feeOps[0].type !== 'payment') {
      return NextResponse.json(
        { success: false, error: 'Fee transaction must contain exactly one payment operation' },
        { status: 400 }
      );
    }
    const feeDestination = (feeOps[0] as { destination: string }).destination;
    if (feeDestination !== getFeesDepositAddress()) {
      return NextResponse.json(
        { success: false, error: 'Fee transaction does not pay the Normal fee address' },
        { status: 400 }
      );
    }

    const nowMs = Date.now();
    const feeMaxTime = Number(feeTx.timeBounds?.maxTime ?? '0');
    const feeExpiresAtMs = feeMaxTime > 0 ? feeMaxTime * 1000 : 0;
    if (!feeExpiresAtMs || feeExpiresAtMs < nowMs + MIN_FEE_RUNWAY_MS) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fee transaction window is missing or too short — rebuild the pair',
        },
        { status: 400 }
      );
    }
    const serviceMaxTime = Number(serviceTx.timeBounds?.maxTime ?? '0');
    const serviceExpiresAtMs = serviceMaxTime > 0 ? serviceMaxTime * 1000 : feeExpiresAtMs;

    // The address inside the signed txs is what gets ownership-checked — the
    // body carries no separate wallet field an attacker could vary.
    const walletAddress = serviceTx.source;
    const owns = await userOwnsWallet(user.id, walletAddress);
    if (!owns) {
      return NextResponse.json(
        { success: false, error: 'Wallet is not linked to your account' },
        { status: 403 }
      );
    }

    const serviceHash = serviceTx.hash().toString('hex');
    const feeHash = feeTx.hash().toString('hex');

    // Escrow FIRST. From here on, completion is server-owned.
    const entry: FeeEscrowEntry = {
      feeXdr: feeXdr as string,
      feeHash,
      serviceXdr: serviceXdr as string,
      serviceHash,
      network,
      userId: user.id,
      walletAddress,
      kind,
      createdAtMs: nowMs,
      feeExpiresAtMs,
      serviceExpiresAtMs,
      status: 'pending',
    };
    await escrowFeePair(entry);

    const horizonServer = new Horizon.Server(config.HORIZON_URL, {
      allowHttp: config.HORIZON_URL.startsWith('http://'),
    });

    // Submit the service tx.
    const serviceResult = await submitSignedXdr(
      horizonServer,
      serviceXdr as string,
      config.NETWORK_PASSPHRASE
    );

    if (serviceResult.outcome === 'failed') {
      // Rejected with result codes — terminal. The fee is never submitted and
      // its sequence number could not apply anyway.
      await resolveEscrow(network, feeHash, 'service_failed');
      return NextResponse.json(
        {
          success: false,
          error: `Transaction failed: ${formatResultCodes(serviceResult.resultCodes)}`,
          resultCodes: serviceResult.resultCodes,
          serviceHash,
        },
        { status: 400 }
      );
    }

    if (serviceResult.outcome === 'unknown') {
      // Horizon timed out — the tx may still land. The escrow stays pending
      // and the sweeper completes whichever way it resolves. The client polls
      // Horizon for the service hash.
      return NextResponse.json({
        success: true,
        servicePending: true,
        serviceHash,
        feeHash,
        feeSubmitted: false,
      });
    }

    // Service landed — collect the fee. A failure here is NOT an error for the
    // user: the sweeper retries until the window closes.
    const feeResult = await submitSignedXdr(
      horizonServer,
      feeXdr as string,
      config.NETWORK_PASSPHRASE
    );
    const feeSubmitted = feeResult.outcome === 'success';
    if (feeSubmitted) {
      await resolveEscrow(network, feeHash, 'completed');
    }

    return NextResponse.json({
      success: true,
      servicePending: false,
      serviceHash,
      feeHash,
      feeSubmitted,
    });
  } catch (error: any) {
    console.error('[fees/execute-pair] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute transaction pair' },
      { status: 500 }
    );
  }
});

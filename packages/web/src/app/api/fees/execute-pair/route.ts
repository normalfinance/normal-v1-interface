import type { NextRequest } from 'next/server';
import type { NetworkType } from '@normalfinance/utils';
import type { FeeEscrowKind, FeeEscrowEntry } from '@/server/fee-escrow';
import type { TxRecordInput, SwapRecordInput, SavingsRecordInput } from '@/server/tx-records';

import { cookies } from 'next/headers';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { userOwnsWallet } from '@/lib/wallet-ownership';
import { getFeesDepositAddress } from '@/lib/build-fee-payment';
import { isValidStellarAddress } from '@/utils/stellar-address';
import { getStellarConfigForNetwork } from '@normalfinance/utils';
import { settleRecord, createPendingRecord } from '@/server/tx-records';
import { Horizon, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { resolveEscrow, escrowFeePair, submitSignedXdr } from '@/server/fee-escrow';

// ---------------------------------------------------------------------------
// #26 fee ordering + #27 record-before-broadcast — the server submit funnel.
//
// The client arrives with signed transactions and NOTHING submitted yet:
// either a service+fee pair (deposit, withdraw with commission, swap) or a
// single service tx (zero-commission withdraw). This route:
//   1. validates the transactions (same source, consecutive sequences, fee
//      really pays our fee address and matches the claimed amount, both
//      signed, sane timebounds) and the caller's ownership of the wallet,
//   2. writes the DB record with status 'pending' BEFORE anything is
//      broadcast (#27) — a transaction can no longer succeed, fail, or
//      vanish without a server row that says so,
//   3. escrows the signed fee in Redis (#26) so pair completion is
//      server-owned even if this invocation dies,
//   4. submits the service tx, then the fee tx, updating the record to a
//      truthful status at each outcome. The cron sweeper settles anything
//      this invocation didn't live to finish.
//
// The wallet address comes from the signed txs themselves — this is not a
// relay for arbitrary transactions, and the record cannot claim a fee the
// fee tx doesn't actually pay.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VALID_KINDS: FeeEscrowKind[] = ['savings_deposit', 'savings_withdraw', 'swap'];

// The fee window must have enough runway left for escrow retries to mean
// anything; the builder issues 15-minute windows, so this only rejects stale
// pairs the user sat on for ages before submitting.
const MIN_FEE_RUNWAY_MS = 60_000;

// record.feeAmount is client-computed with 7-decimal rounding; the fee tx
// amount is the ground truth. Anything past rounding noise is a lie.
const FEE_MATCH_EPSILON = 1e-6;

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

const isPositiveAmount = (v: unknown): v is string =>
  typeof v === 'string' && Number.isFinite(Number(v)) && Number(v) > 0;

/** Validate the client-supplied record payload into a typed TxRecordInput. */
function parseRecordInput(kind: FeeEscrowKind, record: unknown, hasFee: boolean): TxRecordInput {
  if (!record || typeof record !== 'object') {
    throw new Error('Missing record payload');
  }

  if (kind === 'swap') {
    const r = record as Partial<SwapRecordInput>;
    if (typeof r.tokenInAddress !== 'string' || !r.tokenInAddress) {
      throw new Error('record.tokenInAddress required');
    }
    if (typeof r.tokenOutAddress !== 'string' || !r.tokenOutAddress) {
      throw new Error('record.tokenOutAddress required');
    }
    if (!isPositiveAmount(r.amountIn)) throw new Error('record.amountIn must be positive');
    if (!isPositiveAmount(r.amountOut)) throw new Error('record.amountOut must be positive');
    if (!isPositiveAmount(r.feeAmount)) throw new Error('record.feeAmount must be positive');
    return {
      kind,
      record: {
        tokenInAddress: r.tokenInAddress,
        tokenOutAddress: r.tokenOutAddress,
        tokenInSymbol: typeof r.tokenInSymbol === 'string' ? r.tokenInSymbol : undefined,
        tokenOutSymbol: typeof r.tokenOutSymbol === 'string' ? r.tokenOutSymbol : undefined,
        amountIn: r.amountIn,
        amountOut: r.amountOut,
        feeAmount: r.feeAmount,
      },
    };
  }

  const r = record as Partial<SavingsRecordInput>;
  if (typeof r.vaultAddress !== 'string' || !isValidStellarAddress(r.vaultAddress)) {
    throw new Error('record.vaultAddress must be a valid address');
  }
  if (!isPositiveAmount(r.amount)) throw new Error('record.amount must be positive');
  if (hasFee && !isPositiveAmount(r.feeAmount)) {
    throw new Error('record.feeAmount must be positive when a fee transaction is present');
  }
  return {
    kind,
    record: {
      vaultAddress: r.vaultAddress,
      amount: r.amount,
      feeAmount: hasFee && isPositiveAmount(r.feeAmount) ? r.feeAmount : null,
    },
  };
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

    const { serviceXdr, feeXdr, kind, record } = await request.json();

    if (!VALID_KINDS.includes(kind)) {
      return NextResponse.json(
        { success: false, error: `kind must be one of ${VALID_KINDS.join(', ')}` },
        { status: 400 }
      );
    }

    // Only a zero-commission withdraw has no fee leg; every other flow
    // charges one, and omitting it would skip the fee entirely.
    const hasFee = feeXdr != null;
    if (!hasFee && kind !== 'savings_withdraw') {
      return NextResponse.json(
        { success: false, error: 'Fee transaction is required for this kind' },
        { status: 400 }
      );
    }

    let serviceTx: Transaction;
    let feeTx: Transaction | null = null;
    let recordInput: TxRecordInput;
    try {
      serviceTx = parseSignedTx(serviceXdr, config.NETWORK_PASSPHRASE, 'service');
      if (hasFee) feeTx = parseSignedTx(feeXdr, config.NETWORK_PASSPHRASE, 'fee');
      recordInput = parseRecordInput(kind, record, hasFee);
    } catch (parseErr: any) {
      return NextResponse.json({ success: false, error: parseErr.message }, { status: 400 });
    }

    if (feeTx) {
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

      // The fee tx must be exactly what it claims: one payment to Normal's
      // fee address, of the amount the record claims (#27 — the record
      // cannot lie about the fee).
      const feeOps = feeTx.operations;
      if (feeOps.length !== 1 || feeOps[0].type !== 'payment') {
        return NextResponse.json(
          { success: false, error: 'Fee transaction must contain exactly one payment operation' },
          { status: 400 }
        );
      }
      const feeOp = feeOps[0] as { destination: string; amount: string };
      if (feeOp.destination !== getFeesDepositAddress()) {
        return NextResponse.json(
          { success: false, error: 'Fee transaction does not pay the Normal fee address' },
          { status: 400 }
        );
      }
      const claimedFee = Number(recordInput.record.feeAmount);
      if (Math.abs(Number(feeOp.amount) - claimedFee) > FEE_MATCH_EPSILON) {
        return NextResponse.json(
          { success: false, error: 'record.feeAmount does not match the fee transaction amount' },
          { status: 400 }
        );
      }
    }

    const nowMs = Date.now();
    let feeExpiresAtMs = 0;
    if (feeTx) {
      const feeMaxTime = Number(feeTx.timeBounds?.maxTime ?? '0');
      feeExpiresAtMs = feeMaxTime > 0 ? feeMaxTime * 1000 : 0;
      if (!feeExpiresAtMs || feeExpiresAtMs < nowMs + MIN_FEE_RUNWAY_MS) {
        return NextResponse.json(
          {
            success: false,
            error: 'Fee transaction window is missing or too short — rebuild the pair',
          },
          { status: 400 }
        );
      }
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
    const feeHash = feeTx ? feeTx.hash().toString('hex') : null;

    // Record BEFORE broadcast (#27). If this write fails, the request aborts
    // with nothing on-chain and the signed pair still valid — retry is free.
    await createPendingRecord({
      input: recordInput,
      walletAddress,
      network,
      serviceHash,
      feeHash,
    });

    // Escrow the fee leg (#26). From here on, pair completion is server-owned.
    if (feeTx && feeHash) {
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
    }

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
      const reason = formatResultCodes(serviceResult.resultCodes);
      if (feeHash) await resolveEscrow(network, feeHash, 'service_failed');
      await settleRecord({ kind, serviceHash, status: 'failed', reason, walletAddress, network });
      return NextResponse.json(
        {
          success: false,
          error: `Transaction failed: ${reason}`,
          resultCodes: serviceResult.resultCodes,
          serviceHash,
        },
        { status: 400 }
      );
    }

    if (serviceResult.outcome === 'unknown') {
      // Horizon timed out — the tx may still land. The record says so, the
      // escrow stays pending, and the cron settles both either way. The
      // client polls Horizon for the service hash.
      await settleRecord({ kind, serviceHash, status: 'submitted', walletAddress, network });
      return NextResponse.json({
        success: true,
        servicePending: true,
        serviceHash,
        feeHash,
        feeSubmitted: false,
      });
    }

    // Service landed — record it (this also fires the #55 cache invalidation
    // for savings), then collect the fee. A fee failure here is NOT an error
    // for the user: the sweeper retries until the window closes.
    await settleRecord({ kind, serviceHash, status: 'confirmed', walletAddress, network });

    let feeSubmitted = false;
    if (feeTx && feeHash) {
      const feeResult = await submitSignedXdr(
        horizonServer,
        feeXdr as string,
        config.NETWORK_PASSPHRASE
      );
      feeSubmitted = feeResult.outcome === 'success';
      if (feeSubmitted) {
        await resolveEscrow(network, feeHash, 'completed');
      }
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

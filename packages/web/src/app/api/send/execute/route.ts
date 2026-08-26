import type { NextRequest } from 'next/server';
// Type-only viem import — erased at compile time (runtime viem loads dynamically).
import type { TransactionSerialized } from 'viem';
import type { SendChain } from '@/server/send-records';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/server/rateLimiter';
import { SOL_RENT_DUST_MESSAGE } from '@/lib/send/native-dust';
import {
  settleSend,
  base58Encode,
  classifyEvmError,
  findUnsettledSend,
  createPendingSend,
  INSUFFICIENT_MESSAGE,
  SEND_IN_FLIGHT_MESSAGE,
  probeAndSettleUnsettledSend,
} from '@/server/send-records';

// ---------------------------------------------------------------------------
// #29 — the server submit funnel for native ETH/SOL sends.
//
// The client builds and SIGNS with the user's passkey (custody unchanged —
// this route can only relay the signed bytes, never alter or spend), then:
//   1. the signed tx is decoded and cross-checked against the claimed
//      amount/destination — the record cannot lie;
//   2. the sender address inside the SIGNED tx must be a Turnkey wallet
//      owned by the authenticated user — not a relay for arbitrary txs;
//   3. any unsettled previous send on this wallet+chain → 409. This is the
//      structural double-send guard: Ethereum gives a retry a FRESH nonce
//      (both txs valid!), so the only safe rule is one unknown at a time —
//      and the cron reconciler settles unknowns within ~2 minutes;
//   4. the send_logs row (with the pre-computed tx hash + EVM nonce) is
//      written BEFORE broadcast — a DB failure aborts with nothing sent;
//   5. broadcast via server RPC; the row is settled to a truthful status.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface DecodedSend {
  from: string;
  txHash: string;
  nonce: number | null;
}

/** Decode + cross-check an EVM signed tx against the claimed send. */
async function decodeEvm(
  signedTx: string,
  amount: string,
  destination: string
): Promise<DecodedSend> {
  const { keccak256, parseEther, parseTransaction, recoverTransactionAddress } = await import(
    'viem'
  );
  // viem types serialized txs as a per-type template-literal union; our input
  // is a validated-at-parse-time hex string, so narrow it once here.
  const raw = (signedTx.startsWith('0x') ? signedTx : `0x${signedTx}`) as TransactionSerialized;
  const parsed = parseTransaction(raw);

  if ((parsed.to ?? '').toLowerCase() !== destination.toLowerCase()) {
    throw new Error('Signed transaction destination does not match the request');
  }
  if ((parsed.value ?? 0n) !== parseEther(amount)) {
    throw new Error('Signed transaction amount does not match the request');
  }
  const from = await recoverTransactionAddress({ serializedTransaction: raw });
  return { from: from.toLowerCase(), txHash: keccak256(raw), nonce: parsed.nonce ?? null };
}

/** Decode + cross-check a Solana signed tx against the claimed send. */
async function decodeSol(
  signedTxB64: string,
  amount: string,
  destination: string
): Promise<DecodedSend> {
  const { Transaction, SystemProgram, SystemInstruction } = await import('@solana/web3.js');
  const { Buffer } = await import('buffer');
  const tx = Transaction.from(Buffer.from(signedTxB64, 'base64'));

  const ix = tx.instructions.find((i) => i.programId.equals(SystemProgram.programId));
  if (!ix) throw new Error('Signed transaction contains no transfer');
  const transfer = SystemInstruction.decodeTransfer(ix);

  if (transfer.toPubkey.toBase58() !== destination) {
    throw new Error('Signed transaction destination does not match the request');
  }
  const lamports = BigInt(Math.round(parseFloat(amount) * 1e9));
  if (BigInt(transfer.lamports) !== lamports) {
    throw new Error('Signed transaction amount does not match the request');
  }
  if (!tx.signature) throw new Error('Transaction is not signed');
  return {
    from: transfer.fromPubkey.toBase58(),
    txHash: base58Encode(new Uint8Array(tx.signature)),
    nonce: null,
  };
}

type BroadcastOutcome = ReturnType<typeof classifyEvmError>;

async function broadcastEvm(signedTx: string): Promise<BroadcastOutcome> {
  const { http, createPublicClient } = await import('viem');
  const rpcUrl = process.env.NEXT_PUBLIC_ETH_RPC_URL ?? 'https://ethereum-rpc.publicnode.com';
  const client = createPublicClient({ transport: http(rpcUrl) });
  const raw = (signedTx.startsWith('0x') ? signedTx : `0x${signedTx}`) as `0x${string}`;
  try {
    await client.sendRawTransaction({ serializedTransaction: raw });
    return { outcome: 'accepted' };
  } catch (err: any) {
    return classifyEvmError(err?.shortMessage ?? err?.message ?? String(err));
  }
}

async function broadcastSol(signedTxB64: string): Promise<BroadcastOutcome> {
  const { Connection } = await import('@solana/web3.js');
  const { Buffer } = await import('buffer');
  const rpcUrl = process.env.NEXT_PUBLIC_SOL_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  try {
    await connection.sendRawTransaction(Buffer.from(signedTxB64, 'base64'), {
      skipPreflight: false,
    });
    return { outcome: 'accepted' };
  } catch (err: any) {
    const message: string = err?.message ?? String(err);
    const m = message.toLowerCase();
    if (m.includes('already been processed')) return { outcome: 'accepted' };
    // Rent-dust rejection (2026-08-26): the send would leave the sender's
    // account in Solana's forbidden 0 < balance < rent-minimum window. Must
    // match BEFORE the generic insufficient check — the node's message
    // contains 'insufficient funds' too and would mask the real cause.
    if (m.includes('insufficientfundsforrent') || m.includes('insufficient funds for rent')) {
      return { outcome: 'rejected', reason: message, friendly: SOL_RENT_DUST_MESSAGE };
    }
    if (m.includes('insufficient lamports') || m.includes('insufficient funds')) {
      return { outcome: 'rejected', reason: message, friendly: INSUFFICIENT_MESSAGE };
    }
    // Preflight simulation failures are definitive rejections.
    if (m.includes('simulation failed') || m.includes('blockhash not found')) {
      return {
        outcome: 'rejected',
        reason: message,
        friendly: 'The network rejected this send. Please try again.',
      };
    }
    return { outcome: 'unknown' };
  }
}

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const { success: withinLimit } = await rateLimiter.limit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { chain, signedTx, symbol, amount, destination } = await request.json();

    if (chain !== 'ethereum' && chain !== 'solana') {
      return NextResponse.json(
        { success: false, error: 'chain must be ethereum or solana' },
        { status: 400 }
      );
    }
    if (typeof signedTx !== 'string' || !signedTx) {
      return NextResponse.json({ success: false, error: 'Missing signedTx' }, { status: 400 });
    }
    if (typeof amount !== 'string' || !(Number(amount) > 0) || typeof destination !== 'string') {
      return NextResponse.json(
        { success: false, error: 'amount and destination required' },
        { status: 400 }
      );
    }

    let decoded: DecodedSend;
    try {
      decoded =
        chain === 'ethereum'
          ? await decodeEvm(signedTx, amount, destination)
          : await decodeSol(signedTx, amount, destination);
    } catch (decodeErr: any) {
      return NextResponse.json({ success: false, error: decodeErr.message }, { status: 400 });
    }

    // Ownership: the sender INSIDE the signed tx must be this user's wallet.
    const wallet = await prisma.turnkeyWallet.findUnique({
      where: { supabaseUid: user.id },
      select: { ethereumAddress: true, solanaAddress: true },
    });
    const owned =
      chain === 'ethereum'
        ? wallet?.ethereumAddress?.toLowerCase() === decoded.from
        : wallet?.solanaAddress === decoded.from;
    if (!owned) {
      return NextResponse.json(
        { success: false, error: 'Wallet is not linked to your account' },
        { status: 403 }
      );
    }

    // The structural double-send guard (see header) — but SELF-CLEARING:
    // before blocking, ask the chain about the earlier send right now. A
    // confirmed/failed previous send settles inline and this one proceeds;
    // only a genuinely-unknown outcome blocks.
    const inFlight = await findUnsettledSend(decoded.from, chain as SendChain);
    if (inFlight) {
      const resolution = await probeAndSettleUnsettledSend({
        ...inFlight,
        chain: chain as SendChain,
      });
      if (resolution === 'wait') {
        return NextResponse.json(
          { success: false, error: SEND_IN_FLIGHT_MESSAGE, txHash: inFlight.txHash },
          { status: 409 }
        );
      }
    }

    const cookieStore = await cookies();
    const network = cookieStore.get('normal-network')?.value ?? 'mainnet';

    // Record BEFORE broadcast — a DB failure aborts with nothing on-chain.
    const recordId = await createPendingSend({
      walletAddress: decoded.from,
      chain: chain as SendChain,
      symbol: typeof symbol === 'string' ? symbol : chain === 'ethereum' ? 'ETH' : 'SOL',
      amount,
      destination,
      txHash: decoded.txHash,
      nonce: decoded.nonce,
      network,
    });

    const result =
      chain === 'ethereum' ? await broadcastEvm(signedTx) : await broadcastSol(signedTx);

    if (result.outcome === 'rejected') {
      await settleSend(recordId, 'failed', result.reason);
      return NextResponse.json({ success: false, error: result.friendly }, { status: 400 });
    }

    if (result.outcome === 'accepted') {
      // Confirmation is the reconciler's job — sends don't block on it.
      await settleSend(recordId, 'submitted');
    }
    // 'unknown': the row stays pending; the reconciler settles it from the
    // chain, and the 409 guard protects against an impatient retry meanwhile.

    return NextResponse.json({
      success: true,
      txHash: decoded.txHash,
      confirming: result.outcome === 'unknown',
    });
  } catch (error: any) {
    console.error('[send/execute] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit send' },
      { status: 500 }
    );
  }
});

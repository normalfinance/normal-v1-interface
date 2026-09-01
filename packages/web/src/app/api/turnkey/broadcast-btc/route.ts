import type { NextRequest } from 'next/server';

import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { Psbt, networks } from 'bitcoinjs-lib';

// ---------------------------------------------------------------------------
// POST /api/turnkey/broadcast-btc
// Receives a signed Bitcoin transaction hex and broadcasts it via mempool.space.
// Body: { signedTxHex: string }
// Response: { txid: string }
//
// Authenticated: not because a signed transaction is secret (anyone holding it
// can broadcast it themselves), but because an open route makes us a public
// Bitcoin relay — strangers proxying arbitrary transactions through our server
// IP, whose abuse or rate-limit flags land on us, not them.
// ---------------------------------------------------------------------------
export const POST = withAuth(async (request: NextRequest) => {
  let body: { signedTxHex: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { signedTxHex } = body;
  if (!signedTxHex) {
    return NextResponse.json({ error: 'signedTxHex is required' }, { status: 400 });
  }

  // Turnkey returns a signed PSBT (not a raw transaction).
  // Finalize all inputs and extract the raw tx hex before broadcasting.
  let rawTxHex: string;
  try {
    const psbt = Psbt.fromHex(signedTxHex, { network: networks.bitcoin });
    psbt.finalizeAllInputs();
    rawTxHex = psbt.extractTransaction().toHex();
    logger.log('[broadcast-btc] PSBT finalized, raw tx length:', rawTxHex.length / 2, 'bytes');
  } catch (psbtErr) {
    logger.error('[broadcast-btc] PSBT finalization failed:', psbtErr);
    return NextResponse.json({ error: 'Failed to finalize signed transaction' }, { status: 400 });
  }

  // Doc 95 Wave 3: the txid is a property of the SIGNED transaction, so we
  // can compute it before broadcasting. That makes the broadcast idempotent:
  // if the network accepted it but we never saw the response (timeout, socket
  // reset), we can ask whether the txid exists rather than reporting a
  // failure for a transaction that is already in the mempool — which used to
  // send users back to re-sign and risk a double spend of the same UTXOs.
  let expectedTxid = '';
  try {
    expectedTxid = Psbt.fromHex(signedTxHex, { network: networks.bitcoin })
      .extractTransaction()
      .getId();
  } catch {
    /* non-fatal: we simply lose the idempotency check below */
  }

  // Doc 95 Wave 4: mempool.space was the ONLY way a signed Bitcoin
  // transaction could reach the network. A rate-limit or outage there
  // stranded an already-signed transaction, and the user had to re-sign
  // against a quote whose deposit channel may have expired. Blockstream
  // serves the same purpose and is an independent operator.
  const RELAYS = [
    {
      name: 'mempool.space',
      post: 'https://mempool.space/api/tx',
      tx: 'https://mempool.space/api/tx/',
    },
    {
      name: 'blockstream',
      post: 'https://blockstream.info/api/tx',
      tx: 'https://blockstream.info/api/tx/',
    },
  ];

  const alreadyBroadcast = async (): Promise<boolean> => {
    if (!expectedTxid) return false;
    for (const relay of RELAYS) {
      try {
        const probe = await fetch(`${relay.tx}${expectedTxid}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (probe.ok) return true;
      } catch {
        /* try the next relay */
      }
    }
    return false;
  };

  try {
    let res: Response | null = null;
    let responseText = '';
    for (const relay of RELAYS) {
      try {
        res = await fetch(relay.post, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: rawTxHex,
          signal: AbortSignal.timeout(20000),
        });
        responseText = await res.text();
        if (res.ok) break;
        logger.warn(`[broadcast-btc] ${relay.name} rejected:`, responseText.slice(0, 200));
      } catch (relayErr) {
        logger.warn(`[broadcast-btc] ${relay.name} unreachable:`, relayErr);
        res = null;
      }
    }

    if (!res || !res.ok) {
      // Already in the mempool? Then this is a success we simply didn't hear
      // about — most often a retry of a request whose response was lost.
      if (await alreadyBroadcast()) {
        logger.log('[broadcast-btc] already in mempool, treating as success:', expectedTxid);
        return NextResponse.json({ txid: expectedTxid });
      }
      logger.error('[broadcast-btc] every relay rejected the tx:', responseText);
      return NextResponse.json({ error: responseText || 'Broadcast failed' }, { status: 502 });
    }

    // mempool.space returns the txid as a plain text string
    const txid = responseText.trim();
    logger.log('[broadcast-btc] Broadcast success:', { txid: txid.slice(0, 16) + '…' });

    return NextResponse.json({ txid });
  } catch (error) {
    // Same rule on a thrown request: the transaction may well be live.
    if (await alreadyBroadcast()) {
      logger.log('[broadcast-btc] request failed but tx is in mempool:', expectedTxid);
      return NextResponse.json({ txid: expectedTxid });
    }
    logger.error('[broadcast-btc] Error:', error);
    return NextResponse.json({ error: 'Failed to broadcast transaction' }, { status: 500 });
  }
});

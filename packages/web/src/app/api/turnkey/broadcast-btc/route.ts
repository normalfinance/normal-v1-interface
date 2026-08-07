import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { logger } from '@normalfinance/utils';
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

  try {
    const res = await fetch('https://mempool.space/api/tx', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: rawTxHex,
    });

    const responseText = await res.text();

    if (!res.ok) {
      logger.error('[broadcast-btc] Mempool rejected tx:', responseText);
      return NextResponse.json(
        { error: responseText || `Broadcast failed (${res.status})` },
        { status: 502 },
      );
    }

    // mempool.space returns the txid as a plain text string
    const txid = responseText.trim();
    logger.log('[broadcast-btc] Broadcast success:', { txid: txid.slice(0, 16) + '…' });

    return NextResponse.json({ txid });
  } catch (error) {
    logger.error('[broadcast-btc] Error:', error);
    return NextResponse.json({ error: 'Failed to broadcast transaction' }, { status: 500 });
  }
});

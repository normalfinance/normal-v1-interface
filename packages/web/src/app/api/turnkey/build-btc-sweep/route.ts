import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { withAuth } from '@/lib/with-auth';
import { NextResponse } from 'next/server';
import { Psbt, networks, payments } from 'bitcoinjs-lib';

// ---------------------------------------------------------------------------
// POST /api/turnkey/build-btc-sweep
// Builds an unsigned PSBT that sweeps ALL UTXOs from `fromAddress` to the
// user's current Bitcoin address (single output, no change).
//
// Migration utility: after importing their own mnemonic, a user's previous
// Turnkey-generated wallet may still hold BTC on its old address. The same
// sub-org passkey signs for both, so the funds just need one sweep tx.
//
// Body: { fromAddress: string }
// ---------------------------------------------------------------------------

const DUST_THRESHOLD_SAT = 546;

interface MempoolUtxo {
  txid: string;
  vout: number;
  value: number;
  status: { confirmed: boolean };
}

function p2wpkhOutputScript(addr: string): Buffer {
  const { output } = payments.p2wpkh({ address: addr, network: networks.bitcoin });
  if (!output) throw new Error(`Could not derive P2WPKH script for ${addr}`);
  return Buffer.from(output);
}

export const POST = withAuth(async (request: NextRequest, { user }) => {
  let body: { fromAddress?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const fromAddress = body.fromAddress?.trim();
  if (!fromAddress) {
    return NextResponse.json({ error: 'fromAddress is required' }, { status: 400 });
  }

  const wallet = await prisma.turnkeyWallet.findUnique({
    where: { supabaseUid: user.id },
    select: { subOrgId: true, bitcoinAddress: true },
  });

  if (!wallet?.bitcoinAddress || !wallet.subOrgId) {
    return NextResponse.json({ error: 'No Bitcoin wallet found for this user' }, { status: 404 });
  }

  const destination = wallet.bitcoinAddress;
  if (fromAddress === destination) {
    return NextResponse.json(
      { error: 'fromAddress is already your current address' },
      { status: 400 }
    );
  }

  try {
    const [utxoRes, feeRes] = await Promise.all([
      fetch(`https://mempool.space/api/address/${fromAddress}/utxo`),
      fetch('https://mempool.space/api/v1/fees/recommended'),
    ]);

    if (!utxoRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch UTXOs' }, { status: 502 });
    }

    const utxos: MempoolUtxo[] = await utxoRes.json();
    if (utxos.length === 0) {
      return NextResponse.json({ error: 'No funds found on that address' }, { status: 400 });
    }

    const feeRates = feeRes.ok ? await feeRes.json() : { halfHourFee: 15 };
    const feeRateSatPerVbyte: number = feeRates.halfHourFee || 15;

    const totalSat = utxos.reduce((s, u) => s + u.value, 0);

    // n-input, 1-output P2WPKH vsize
    const inputCount = utxos.length;
    const nonWitnessBytes = 10 + inputCount * 41 + 31;
    const witnessBytes = inputCount * 107 + 2;
    const vsize = Math.ceil((nonWitnessBytes * 4 + witnessBytes) / 4);
    const feeSat = Math.ceil(feeRateSatPerVbyte * vsize);

    const sweepAmountSat = totalSat - feeSat;
    if (sweepAmountSat <= DUST_THRESHOLD_SAT) {
      return NextResponse.json(
        { error: `Balance too small to sweep after fees (${totalSat} sat, fee ~${feeSat} sat)` },
        { status: 400 }
      );
    }

    const prevTxHexes = await Promise.all(
      utxos.map(async (utxo) => {
        const res = await fetch(`https://mempool.space/api/tx/${utxo.txid}/hex`);
        if (!res.ok) throw new Error(`Failed to fetch prev tx ${utxo.txid} (${res.status})`);
        return res.text();
      })
    );

    const psbt = new Psbt({ network: networks.bitcoin });
    const senderScript = p2wpkhOutputScript(fromAddress);

    for (let i = 0; i < utxos.length; i++) {
      psbt.addInput({
        hash: utxos[i].txid,
        index: utxos[i].vout,
        witnessUtxo: { script: senderScript, value: BigInt(utxos[i].value) },
        nonWitnessUtxo: Buffer.from(prevTxHexes[i], 'hex'),
      });
    }

    psbt.addOutput({ address: destination, value: BigInt(sweepAmountSat) });

    logger.log('[build-btc-sweep] Sweep PSBT built', {
      uid: user.id.slice(0, 8),
      inputs: utxos.length,
      totalSat,
      feeSat,
    });

    return NextResponse.json({
      psbtHex: psbt.toHex(),
      subOrgId: wallet.subOrgId,
      fromAddress,
      destination,
      totalSat,
      feeSat,
      sweepAmountSat,
    });
  } catch (error) {
    logger.error('[build-btc-sweep] Error:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to build sweep: ${detail}` }, { status: 500 });
  }
});

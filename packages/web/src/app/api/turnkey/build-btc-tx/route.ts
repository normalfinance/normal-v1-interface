import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { logger } from '@normalfinance/utils';
import { getAccessToken } from '@/utils/http';
import { Psbt, networks, payments } from 'bitcoinjs-lib';
import { getAuthenticatedUser } from '@/lib/createSupabaseServerClient';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DUST_THRESHOLD_SAT = 546; // P2WPKH dust limit
const ESTIMATED_VSIZE_1IN_2OUT = 141; // typical P2WPKH 1-in 2-out vbytes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MempoolUtxo {
  txid: string;
  vout: number;
  value: number; // satoshis
  status: { confirmed: boolean };
}

interface MempoolFeeRates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
}

function p2wpkhOutputScript(addr: string): Buffer {
  const { output } = payments.p2wpkh({ address: addr, network: networks.bitcoin });
  if (!output) throw new Error(`Could not derive P2WPKH script for ${addr}`);
  return Buffer.from(output);
}

// ---------------------------------------------------------------------------
// POST /api/turnkey/build-btc-tx
// Builds an unsigned PSBT for the authenticated user's Bitcoin address.
// Body: { destination: string, amountSat: number }
// Response: { psbtHex, subOrgId, estimatedFeeSat, feeRateSatPerVbyte, changeAmountSat }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const accessToken = getAccessToken(request);
  const user = await getAuthenticatedUser(accessToken);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { destination: string; amountSat: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { destination, amountSat } = body;
  if (!destination || !amountSat || amountSat <= 0) {
    return NextResponse.json({ error: 'destination and amountSat are required' }, { status: 400 });
  }

  // Fetch user's Turnkey wallet record
  const wallet = await prisma.turnkeyWallet.findUnique({
    where: { supabaseUid: user.id },
    select: { subOrgId: true, bitcoinAddress: true },
  });

  if (!wallet?.bitcoinAddress || !wallet.subOrgId) {
    return NextResponse.json({ error: 'No Bitcoin wallet found for this user' }, { status: 404 });
  }

  try {
    // Fetch UTXOs + fee rates in parallel
    const [utxoRes, feeRes] = await Promise.all([
      fetch(`https://mempool.space/api/address/${wallet.bitcoinAddress}/utxo`),
      fetch('https://mempool.space/api/v1/fees/recommended'),
    ]);

    if (!utxoRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch UTXOs' }, { status: 502 });
    }

    const utxos: MempoolUtxo[] = await utxoRes.json();
    const feeRates: MempoolFeeRates = feeRes.ok
      ? await feeRes.json()
      : { fastestFee: 20, halfHourFee: 15, hourFee: 10 };

    // Use halfHourFee for a balance between speed and cost
    const feeRateSatPerVbyte = feeRates.halfHourFee || 15;

    // Estimate fee (recomputed below with actual input count, but use 1-in estimate first)
    let estimatedVsize = ESTIMATED_VSIZE_1IN_2OUT;
    let estimatedFeeSat = Math.ceil(feeRateSatPerVbyte * estimatedVsize);

    // Coin selection — prefer confirmed UTXOs, sort by value descending
    const confirmed = utxos.filter((u) => u.status.confirmed).sort((a, b) => b.value - a.value);
    const unconfirmed = utxos.filter((u) => !u.status.confirmed).sort((a, b) => b.value - a.value);
    const orderedUtxos = [...confirmed, ...unconfirmed];

    const selected: MempoolUtxo[] = [];
    let totalInput = 0;
    for (const utxo of orderedUtxos) {
      selected.push(utxo);
      totalInput += utxo.value;

      // Recompute fee estimate with the actual input count
      // P2WPKH input: 41 bytes non-witness + ~107 bytes witness
      const inputCount = selected.length;
      const nonWitnessBytes = 10 + inputCount * 41 + 2 * 31; // 2 outputs
      const witnessBytes = inputCount * 107 + 2; // witness marker/flag
      estimatedVsize = Math.ceil((nonWitnessBytes * 4 + witnessBytes) / 4);
      estimatedFeeSat = Math.ceil(feeRateSatPerVbyte * estimatedVsize);

      if (totalInput >= amountSat + estimatedFeeSat) break;
    }

    if (totalInput < amountSat + estimatedFeeSat) {
      return NextResponse.json({ error: 'Insufficient Bitcoin balance' }, { status: 400 });
    }

    const changeAmountSat = totalInput - amountSat - estimatedFeeSat;
    const hasChange = changeAmountSat > DUST_THRESHOLD_SAT;

    // Fetch full raw transaction hex for each input in parallel.
    // Turnkey requires nonWitnessUtxo alongside witnessUtxo for SegWit v0 inputs.
    const prevTxHexes = await Promise.all(
      selected.map(async (utxo) => {
        const res = await fetch(`https://mempool.space/api/tx/${utxo.txid}/hex`);
        if (!res.ok) throw new Error(`Failed to fetch prev tx ${utxo.txid} (${res.status})`);
        return res.text();
      })
    );

    // Build PSBT
    const psbt = new Psbt({ network: networks.bitcoin });
    const senderScript = p2wpkhOutputScript(wallet.bitcoinAddress);

    for (let i = 0; i < selected.length; i++) {
      const utxo = selected[i];
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: senderScript,
          value: BigInt(utxo.value),
        },
        // Required by Turnkey (and hardware wallets) to prevent fee manipulation attacks
        nonWitnessUtxo: Buffer.from(prevTxHexes[i], 'hex'),
      });
    }

    // Recipient output
    psbt.addOutput({ address: destination, value: BigInt(amountSat) });

    // Change output (if above dust)
    if (hasChange) {
      psbt.addOutput({ address: wallet.bitcoinAddress, value: BigInt(changeAmountSat) });
    }

    const psbtHex = psbt.toHex();

    logger.log('[build-btc-tx] PSBT built', {
      uid: user.id.slice(0, 8),
      inputs: selected.length,
      amountSat,
      estimatedFeeSat,
      changeAmountSat: hasChange ? changeAmountSat : 0,
    });

    return NextResponse.json({
      psbtHex,
      subOrgId: wallet.subOrgId,
      estimatedFeeSat,
      feeRateSatPerVbyte,
      changeAmountSat: hasChange ? changeAmountSat : 0,
    });
  } catch (error) {
    logger.error('[build-btc-tx] Error:', error);
    return NextResponse.json({ error: 'Failed to build transaction' }, { status: 500 });
  }
}

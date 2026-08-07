'use client';

import type { Token } from '@normalfinance/types';

import { BigNumber } from 'bignumber.js';
import { buildAuthHeaders } from '@/utils/http';
import { announceTransaction } from '@/lib/tx-events';

import type { SendParams, SendAdapter } from './index';

// ----------------------------------------------------------------------

/** Mainnet bech32 P2WPKH / P2TR — basic prefix + length check */
function isValidBitcoinAddress(addr: string): boolean {
  // P2WPKH: bc1q + 38 chars = 42 total
  // P2TR:   bc1p + 58 chars = 62 total
  // Legacy: 1... or 3...
  return (
    /^bc1q[a-z0-9]{38,39}$/i.test(addr) ||
    /^bc1p[a-z0-9]{58}$/i.test(addr) ||
    /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr)
  );
}

export interface BtcBuildResult {
  psbtHex: string;
  subOrgId: string;
  estimatedFeeSat: number;
  feeRateSatPerVbyte: number;
  changeAmountSat: number;
}

async function buildBtcTransaction(
  destination: string,
  amountSat: number
): Promise<BtcBuildResult> {
  const headers = await buildAuthHeaders();
  const res = await fetch('/api/turnkey/build-btc-tx', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination, amountSat }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to build transaction (${res.status})`);
  }
  return res.json();
}

async function broadcastBtcTransaction(signedTxHex: string): Promise<string> {
  const headers = await buildAuthHeaders();
  const res = await fetch('/api/turnkey/broadcast-btc', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedTxHex }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Broadcast failed (${res.status})`);
  }
  const data = await res.json();
  return data.txid as string;
}

export function createBitcoinAdapter(
  bitcoinAddress: string,
  onError?: (msg: string) => void
): SendAdapter {
  return {
    network: 'bitcoin',
    hasMemo: false,
    addressPlaceholder: 'bc1q…',
    feeInfo: null, // computed async in the modal

    validateAddress: isValidBitcoinAddress,

    getSpendableBalance(token: Token): BigNumber {
      return BigNumber(token.balance);
    },

    async send(params: SendParams): Promise<string> {
      try {
        const amountSat = Math.round(parseFloat(params.amount) * 1e8);
        if (!amountSat || amountSat <= 0) throw new Error('Invalid amount');

        // Step 1 — build unsigned PSBT on the server
        const { psbtHex, subOrgId } = await buildBtcTransaction(params.destination, amountSat);

        // Step 2 — sign with Turnkey via the user's passkey (WebAuthn prompt)
        const rpId =
          typeof window !== 'undefined'
            ? (process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname)
            : 'localhost';

        const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
        const { TurnkeyClient } = await import('@turnkey/http');

        const stamper = new WebauthnStamper({ rpId });
        const client = new TurnkeyClient({ baseUrl: 'https://api.turnkey.com' }, stamper);

        const signResult = await client.signTransaction({
          type: 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2',
          timestampMs: String(Date.now()),
          organizationId: subOrgId,
          parameters: {
            signWith: bitcoinAddress,
            unsignedTransaction: psbtHex,
            type: 'TRANSACTION_TYPE_BITCOIN',
          },
        });

        const signedTx = signResult?.activity?.result?.signTransactionResult?.signedTransaction;
        if (!signedTx) throw new Error('Signing failed — no signed transaction returned');

        // Step 3 — broadcast via our server (avoids CORS issues with mempool.space)
        const txid = await broadcastBtcTransaction(signedTx);

        // Pending row + cache-bypassed refresh. Matters most on Bitcoin: the
        // row is the only feedback until the chain confirms, possibly hours.
        announceTransaction({
          chain: 'bitcoin',
          pendingSend: {
            txHash: txid,
            symbol: 'BTC',
            amount: params.amount,
            destination: params.destination,
          },
        });

        return txid;
      } catch (err: any) {
        const msg: string = err?.message ?? 'Bitcoin transaction failed';
        onError?.(msg);
        return '';
      }
    },
  };
}

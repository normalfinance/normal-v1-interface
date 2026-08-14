'use client';

import type { Token } from '@normalfinance/types';

import { BigNumber } from 'bignumber.js';
import { announceTransaction } from '@/lib/tx-events';
import { SOL_RPC_URL } from '@/hooks/use-chain-portfolio';
import { getTurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';

import type { SendParams, SendAdapter } from './index';

// ----------------------------------------------------------------------
// Native SOL transfers. The transfer message is built with @solana/web3.js,
// signed by Turnkey as a raw ed25519 payload via the user's passkey, and
// broadcast over the public RPC.
// ----------------------------------------------------------------------

// Base network fee for a single-signature transfer
const SOL_FEE = 0.000005;

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function createSolanaAdapter(
  solanaAddress: string,
  onError?: (msg: string) => void
): SendAdapter {
  return {
    network: 'solana',
    hasMemo: false,
    addressPlaceholder: 'Solana address…',
    feeInfo: {
      label: `${SOL_FEE} SOL`,
      fiatLabel: '',
      tooltip: 'Solana base network fee for a single transfer.',
    },

    validateAddress(address: string): boolean {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    },

    getSpendableBalance(token: Token): BigNumber {
      const spendable = BigNumber(token.balance).minus(SOL_FEE);
      return spendable.gt(0) ? spendable : BigNumber(0);
    },

    async send(params: SendParams): Promise<string> {
      try {
        const info = await getTurnkeyWalletInfo();
        if (!info?.subOrgId) throw new Error('Turnkey wallet not found');
        const subOrgId = info.subOrgId;

        const { PublicKey, Connection, Transaction, SystemProgram } = await import(
          '@solana/web3.js'
        );

        const connection = new Connection(SOL_RPC_URL, 'confirmed');
        const fromPubkey = new PublicKey(solanaAddress);
        const toPubkey = new PublicKey(params.destination);
        const lamports = Math.round(parseFloat(params.amount) * 1e9);
        if (!lamports || lamports <= 0) throw new Error('Invalid amount');

        const tx = new Transaction().add(
          SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
        );
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = fromPubkey;

        const message = tx.serializeMessage();

        // Sign with Turnkey via the user's passkey (WebAuthn prompt) —
        // ed25519 signs the raw message, no pre-hashing.
        const rpId =
          typeof window !== 'undefined'
            ? (process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname)
            : 'localhost';
        const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
        const { TurnkeyClient } = await import('@turnkey/http');
        const turnkeyClient = new TurnkeyClient(
          { baseUrl: 'https://api.turnkey.com' },
          new WebauthnStamper({ rpId })
        );

        // Guarded ceremony (#51 coverage completed 2026-08-14).
        const { runWebauthnCeremony } = await import('@/lib/turnkey/webauthn-guard');
        const signResult = await runWebauthnCeremony(() =>
          turnkeyClient.signRawPayload({
            type: 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2',
            timestampMs: String(Date.now()),
            organizationId: subOrgId,
            parameters: {
              signWith: solanaAddress,
              payload: bytesToHex(message),
              encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
              hashFunction: 'HASH_FUNCTION_NOT_APPLICABLE',
            },
          })
        );

        const result = signResult?.activity?.result?.signRawPayloadResult;
        if (!result?.r || !result?.s) throw new Error('Signing failed — no signature returned');

        const signature = new Uint8Array(64);
        signature.set(hexToBytes(result.r.padStart(64, '0')), 0);
        signature.set(hexToBytes(result.s.padStart(64, '0')), 32);

        const { Buffer } = await import('buffer');
        tx.addSignature(fromPubkey, Buffer.from(signature));
        if (!tx.verifySignatures()) throw new Error('Signature verification failed');

        // Broadcast through the server funnel (#29): the signed tx is
        // recorded BEFORE broadcast, the server relays it (like BTC), and a
        // previous send with an unknown outcome blocks this one (409) — the
        // structural double-send guard. Custody unchanged: the tx above is
        // already fully signed by the passkey.
        const { buildAuthHeaders } = await import('@/utils/http');
        const res = await fetch('/api/send/execute', {
          method: 'POST',
          headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chain: 'solana',
            signedTx: Buffer.from(tx.serialize()).toString('base64'),
            symbol: 'SOL',
            amount: params.amount,
            destination: params.destination,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Send failed. Please try again.');
        }
        const txid: string = data.txHash;

        // Pending row + cache-bypassed refresh (see lib/tx-events.ts).
        announceTransaction({
          chain: 'solana',
          pendingSend: {
            txHash: txid,
            symbol: 'SOL',
            amount: params.amount,
            destination: params.destination,
          },
        });

        // #62: fire ONE more refresh at the exact moment the chain confirms —
        // SOL lands in ~2s, well before the old +8s timer shot, and this one
        // cannot be swallowed by the server cache floor. Confirmation also
        // ends the pending row's SPENDABLE subtraction (#66 follow-up — see
        // the note in the ethereum adapter).
        void import('@/lib/send-confirmation').then(({ watchSendConfirmation }) =>
          watchSendConfirmation('solana', txid, (outcome) => {
            if (outcome === 'confirmed') {
              void import('@/lib/pending-sends').then(({ markSendConfirmed }) =>
                markSendConfirmed(txid)
              );
            }
            void import('@/lib/tx-events').then(({ announceConfirmation }) =>
              announceConfirmation('solana')
            );
          })
        );

        return txid;
      } catch (err: any) {
        const msg: string = err?.message ?? 'Solana transaction failed';
        onError?.(msg);
        return '';
      }
    },
  };
}

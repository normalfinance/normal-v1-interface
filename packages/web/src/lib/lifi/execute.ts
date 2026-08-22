'use client';

import type { ChainAddresses } from '@/lib/chains/registry';

import { describePsbt } from '@/lib/lifi/psbt-debug';
import { getTurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';
import { runWebauthnCeremony } from '@/lib/turnkey/webauthn-guard';
import { createPasskeyStamper } from '@/lib/turnkey/passkey-stamper';
import { ETH_RPC_URL, SOL_RPC_URL } from '@/hooks/use-chain-portfolio';

// ---------------------------------------------------------------------------
// Executes a LI.FI quote's transactionRequest on the source chain, signed by
// the user's Turnkey passkey.
//
// CRITICAL (Bitcoin): LI.FI returns a PSBT with a FIXED output structure
// (bridge deposit, OP_RETURN memo, refund output). It must be signed EXACTLY
// as returned — modifying outputs can make deposits unrefundable (permanent
// loss on Chainflip). We only ever ADD signatures to it; see lib/lifi/btc-sign.ts
// for why Turnkey's PSBT parser is bypassed.
// ---------------------------------------------------------------------------

export const LIFI_CHAIN_IDS = {
  ETH: 1,
  SOL: 1151111081099710,
  BTC: 20000000000001,
} as const;

interface LifiTransactionRequest {
  data: string;
  to?: string;
  value?: string;
  from?: string;
  chainId?: number;
  gasPrice?: string;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export interface LifiQuote {
  tool: string;
  action: {
    fromChainId: number;
    toChainId: number;
    fromAmount: string;
  };
  estimate: {
    toAmount: string;
    toAmountMin: string;
    executionDuration: number;
    /** Per-route gas costs from LI.FI — the swap card's gas-honesty line,
     *  20% warning and 50% block read amountUSD (Niko GO 2026-08-20). */
    gasCosts?: { amountUSD?: string }[];
  };
  transactionRequest: LifiTransactionRequest;
}

function log(msg: string, extra?: unknown) {
  // Visible in browser devtools to trace each swap step.
  if (extra !== undefined) console.log(`[lifi-swap] ${msg}`, extra);
  else console.log(`[lifi-swap] ${msg}`);
}

async function getTurnkeyClient() {
  const { TurnkeyClient } = await import('@turnkey/http');
  return new TurnkeyClient({ baseUrl: 'https://api.turnkey.com' }, await createPasskeyStamper());
}

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

// --- Ethereum source ---------------------------------------------------------

async function executeEvm(
  quote: LifiQuote,
  ethereumAddress: string,
  subOrgId: string
): Promise<string> {
  const { http, createPublicClient, serializeTransaction } = await import('viem');
  const { mainnet } = await import('viem/chains');

  const tx = quote.transactionRequest;
  const client = createPublicClient({ chain: mainnet, transport: http(ETH_RPC_URL) });
  log('ETH: fetching nonce + gas');
  const nonce = await client.getTransactionCount({
    address: ethereumAddress as `0x${string}`,
    blockTag: 'pending',
  });

  // LI.FI always sends gasLimit today, but a missing one would otherwise
  // broadcast with gas 0 and fail — estimate live as the fallback (#29).
  const gas = tx.gasLimit
    ? BigInt(tx.gasLimit)
    : await client.estimateGas({
        account: ethereumAddress as `0x${string}`,
        to: tx.to as `0x${string}`,
        value: BigInt(tx.value ?? '0'),
        data: tx.data as `0x${string}`,
      });

  const common = {
    chainId: tx.chainId ?? mainnet.id,
    nonce,
    to: tx.to as `0x${string}`,
    value: BigInt(tx.value ?? '0'),
    data: tx.data as `0x${string}`,
    gas,
  };

  // LI.FI's quoted gas price can be stale by the time the user approves the
  // passkey — if it's below the live network rate the tx gets dropped from
  // the mempool and never mines. Re-price to the current network fee, never
  // going below what LI.FI intended.
  const max = (a: bigint, b: bigint) => (a > b ? a : b);
  const liveFees = await client.estimateFeesPerGas().catch(() => null);

  const legacyPrice = tx.gasPrice
    ? max(BigInt(tx.gasPrice), (await client.getGasPrice().catch(() => 0n)) as bigint)
    : null;
  const maxFeePerGas = max(BigInt(tx.maxFeePerGas ?? '0'), liveFees?.maxFeePerGas ?? 0n);

  // Dynamic-gas layer 2 (Niko GO 2026-08-21): run the node's own admission
  // rule (balance ≥ value + gas×price) LOCALLY, before the passkey ceremony.
  // A gas spike between quote and now used to surface as the node's raw
  // "insufficient funds" dump after the user had already signed; now it
  // raises a structured shortfall BEFORE anything signs, and the engines
  // offer the affordable amount instead of an error. Balance-read failure
  // skips the check (the node still enforces it — this is UX, not custody).
  const { computeAffordability, GasShortfallError } = await import('@/lib/lifi/gas-shortfall');
  const balanceWei = await client
    .getBalance({ address: ethereumAddress as `0x${string}` })
    .catch(() => null);
  if (balanceWei !== null) {
    const check = computeAffordability({
      balanceWei,
      valueWei: common.value,
      gasLimit: gas,
      feePerGas: legacyPrice ?? maxFeePerGas,
    });
    if (!check.affordable) {
      log('ETH: gas shortfall detected pre-sign', {
        balance: balanceWei.toString(),
        needs: check.costWei.toString(),
      });
      throw new GasShortfallError({ ...check, balanceWei });
    }
  }

  const unsigned = legacyPrice
    ? serializeTransaction({
        ...common,
        type: 'legacy',
        gasPrice: legacyPrice,
      })
    : serializeTransaction({
        ...common,
        type: 'eip1559',
        maxFeePerGas,
        maxPriorityFeePerGas: max(
          BigInt(tx.maxPriorityFeePerGas ?? '0'),
          liveFees?.maxPriorityFeePerGas ?? 0n
        ),
      });

  const turnkey = await getTurnkeyClient();
  log('ETH: requesting passkey signature');
  // Serialized + fast-fail-retried like every other passkey ceremony (#51 —
  // this path was missed in the original guard rollout and failed live with
  // WebAuthn NotAllowedError, 2026-08-14).
  const signResult = await runWebauthnCeremony(() =>
    turnkey.signTransaction({
      type: 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2',
      timestampMs: String(Date.now()),
      organizationId: subOrgId,
      parameters: {
        signWith: ethereumAddress,
        unsignedTransaction: unsigned.startsWith('0x') ? unsigned.slice(2) : unsigned,
        type: 'TRANSACTION_TYPE_ETHEREUM',
      },
    })
  );
  const signedTx = signResult?.activity?.result?.signTransactionResult?.signedTransaction;
  if (!signedTx) throw new Error('Signing failed — no signed transaction returned');

  log('ETH: broadcasting');
  // Return as soon as the tx is broadcast — the status modal tracks the
  // receipt + bridge non-blockingly (a dropped/underpriced tx surfaces there
  // as "Failed", not as a frozen button).
  const hash = await client.sendRawTransaction({
    serializedTransaction: (signedTx.startsWith('0x')
      ? signedTx
      : `0x${signedTx}`) as `0x${string}`,
  });
  log('ETH: broadcast hash', hash);
  return hash;
}

// --- Bitcoin source ----------------------------------------------------------

// Every PSBT starts with the magic bytes "psbt\xff" — 70736274ff in hex,
// which is why a base64 PSBT always begins "cHNidP8".
const PSBT_MAGIC_HEX = /^70736274ff/i;

/**
 * Turnkey wants the PSBT as HEX. LI.FI hands it over base64-encoded (the
 * conventional PSBT transport, and the same encoding its Solana payload uses).
 * Passing base64 straight through made Turnkey decode nonsense and fail with
 * "failed to extract bitcoin address from script: UnrecognizedScript".
 *
 * Detect by magic bytes rather than guessing at the format, and fail loudly if
 * it is neither — silently mangling a PSBT is the one thing we must not do
 * here (see the Bitcoin warning at the top of this file).
 */
function psbtToHex(data: string): string {
  const raw = data.startsWith('0x') ? data.slice(2) : data;
  if (PSBT_MAGIC_HEX.test(raw)) return raw;

  const hex = bytesToHex(Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)));
  if (PSBT_MAGIC_HEX.test(hex)) {
    log('BTC: PSBT was base64, converted to hex');
    return hex;
  }

  throw new Error('Unrecognised PSBT encoding from LI.FI — expected hex or base64');
}

async function executeBtc(
  quote: LifiQuote,
  bitcoinAddress: string,
  subOrgId: string
): Promise<string> {
  // The PSBT from LI.FI — re-encoded if needed, but never rebuilt or reordered.
  const psbtHex = psbtToHex(quote.transactionRequest.data);

  const turnkey = await getTurnkeyClient();
  // Decode what LI.FI actually sent, so any failure names the broken rule
  // instead of leaving us to guess (see psbt-debug.ts).
  const summary = describePsbt(psbtHex);
  // Compact, one-line form — attached to any signing error below so the
  // diagnosis travels WITH the error rather than sitting in a separate console
  // line someone has to go and find.
  const psbtDescription =
    `bytes=${psbtHex.length / 2} signWith=${bitcoinAddress} ` +
    `inputs=[${summary.inputs
      .map(
        (inp) =>
          `#${inp.index} ${inp.witnessUtxoScript ?? 'no-witness_utxo'} {${inp.fields.join(',')}}`
      )
      .join(' | ')}] ` +
    `outputs=[${summary.outputs.map((o) => o.script).join(', ')}]` +
    (summary.error ? ` decodeError=${summary.error}` : '');

  log('BTC: signing PSBT', psbtDescription);

  // Fail before asking Turnkey when the PSBT breaks a documented rule — a clear
  // message beats "UnrecognizedScript" from three layers away.
  const offending = summary.inputs.find(
    (inp) => inp.fields.includes('non_witness_utxo') && inp.witnessUtxoScript?.startsWith('P2W')
  );
  if (offending) {
    throw new Error(
      `PSBT input ${offending.index} carries non_witness_utxo on a ${offending.witnessUtxoScript} ` +
        `input. Turnkey forbids that field for segwit inputs (LI.FI PSBT format issue). ${psbtDescription}`
    );
  }

  // NOT TRANSACTION_TYPE_BITCOIN. Turnkey's PSBT parser derives an address from
  // every script and fails on LI.FI's OP_RETURN memo output, which has no
  // address — verified by decoding the PSBT: our inputs meet every documented
  // requirement. Instead we compute the sighashes locally and sign those with
  // SIGN_RAW_PAYLOADS, which is Turnkey's own documented alternative. The
  // transaction itself is never modified; we only add signatures.
  //
  // Imported dynamically, like viem and web3.js above: it pulls in
  // bitcoinjs-lib, and only Bitcoin-source swaps need it. A static import puts
  // that weight in the bundle of every user who opens /swap.
  let signedTx: string;
  try {
    const { signLifiBtcPsbt } = await import('@/lib/lifi/btc-sign');
    // One ceremony (batched raw-payload signing) — guarded like all others (#51).
    signedTx = await runWebauthnCeremony(() =>
      signLifiBtcPsbt(psbtHex, bitcoinAddress, subOrgId, turnkey)
    );
  } catch (err: any) {
    // Keep the decode attached: any Bitcoin signing failure should say what was
    // in the PSBT, or it can't be acted on or reported upstream.
    const msg = err?.shortMessage ?? err?.message ?? String(err);
    throw new Error(`${msg} — PSBT: ${psbtDescription}`);
  }

  log('BTC: broadcasting');
  const { buildAuthHeaders } = await import('@/utils/http');
  const res = await fetch('/api/turnkey/broadcast-btc', {
    method: 'POST',
    headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedTxHex: signedTx }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Broadcast failed (${res.status})`);
  }
  const data = await res.json();
  log('BTC: broadcast txid', data.txid);
  return data.txid as string;
}

// --- Solana source -----------------------------------------------------------

async function executeSol(
  quote: LifiQuote,
  solanaAddress: string,
  subOrgId: string
): Promise<string> {
  const { PublicKey, Connection, VersionedTransaction } = await import('@solana/web3.js');

  const raw = Uint8Array.from(atob(quote.transactionRequest.data), (c) => c.charCodeAt(0));
  const connection = new Connection(SOL_RPC_URL, 'confirmed');
  const userKey = new PublicKey(solanaAddress);

  // LI.FI returns a v0 VersionedTransaction; deserialize handles legacy too.
  // (Do NOT fall back to legacy Transaction.from — it throws on v0 messages
  // and would mask the real signing/broadcast error.)
  const vtx = VersionedTransaction.deserialize(raw);
  const signerIndex = vtx.message.staticAccountKeys.findIndex((key) => key.equals(userKey));
  if (signerIndex < 0) throw new Error('Your wallet is not a signer on this transaction');

  // Sign the serialized message bytes (ed25519, no pre-hash) with Turnkey.
  const turnkey = await getTurnkeyClient();
  log('SOL: requesting passkey signature');
  const signResult = await runWebauthnCeremony(() =>
    turnkey.signRawPayload({
      type: 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2',
      timestampMs: String(Date.now()),
      organizationId: subOrgId,
      parameters: {
        signWith: solanaAddress,
        payload: bytesToHex(vtx.message.serialize()),
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
  vtx.signatures[signerIndex] = signature;

  log('SOL: broadcasting');
  const sig = await connection.sendRawTransaction(vtx.serialize(), { skipPreflight: false });
  log('SOL: broadcast signature', sig);
  return sig;
}

// --- Entry -------------------------------------------------------------------

export async function executeLifiSwap(
  quote: LifiQuote,
  // One object from the registry rather than a field per chain, so a new chain
  // doesn't change this signature. The per-chain signers below stay separate —
  // each one speaks a different protocol.
  addresses: ChainAddresses
): Promise<string> {
  const info = await getTurnkeyWalletInfo();
  if (!info?.subOrgId) throw new Error('Turnkey wallet not found');

  switch (quote.action.fromChainId) {
    case LIFI_CHAIN_IDS.ETH:
      if (!addresses.ethereumAddress) throw new Error('Missing Ethereum address');
      return executeEvm(quote, addresses.ethereumAddress, info.subOrgId);
    case LIFI_CHAIN_IDS.BTC:
      if (!addresses.bitcoinAddress) throw new Error('Missing Bitcoin address');
      return executeBtc(quote, addresses.bitcoinAddress, info.subOrgId);
    case LIFI_CHAIN_IDS.SOL:
      if (!addresses.solanaAddress) throw new Error('Missing Solana address');
      return executeSol(quote, addresses.solanaAddress, info.subOrgId);
    default:
      throw new Error(`Unsupported source chain ${quote.action.fromChainId}`);
  }
}

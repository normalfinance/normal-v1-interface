'use client';

import type { ChainAddresses } from '@/lib/chains/registry';

import { getTurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';
import { ETH_RPC_URL, SOL_RPC_URL } from '@/hooks/use-chain-portfolio';

// ---------------------------------------------------------------------------
// Executes a LI.FI quote's transactionRequest on the source chain, signed by
// the user's Turnkey passkey.
//
// CRITICAL (Bitcoin): LI.FI returns a PSBT with a FIXED output structure
// (bridge deposit, OP_RETURN memo, refund output). It must be signed EXACTLY
// as returned — modifying outputs can make deposits unrefundable (permanent
// loss on Chainflip). We pass it straight to Turnkey untouched.
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
  };
  transactionRequest: LifiTransactionRequest;
}

function log(msg: string, extra?: unknown) {
  // Visible in browser devtools to trace each swap step.
  if (extra !== undefined) console.log(`[lifi-swap] ${msg}`, extra);
  else console.log(`[lifi-swap] ${msg}`);
}

async function getTurnkeyClient() {
  const rpId =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname
      : 'localhost';
  const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
  const { TurnkeyClient } = await import('@turnkey/http');
  return new TurnkeyClient({ baseUrl: 'https://api.turnkey.com' }, new WebauthnStamper({ rpId }));
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

  const common = {
    chainId: tx.chainId ?? mainnet.id,
    nonce,
    to: tx.to as `0x${string}`,
    value: BigInt(tx.value ?? '0'),
    data: tx.data as `0x${string}`,
    gas: BigInt(tx.gasLimit ?? '0'),
  };

  // LI.FI's quoted gas price can be stale by the time the user approves the
  // passkey — if it's below the live network rate the tx gets dropped from
  // the mempool and never mines. Re-price to the current network fee, never
  // going below what LI.FI intended.
  const max = (a: bigint, b: bigint) => (a > b ? a : b);
  const liveFees = await client.estimateFeesPerGas().catch(() => null);

  const unsigned = tx.gasPrice
    ? serializeTransaction({
        ...common,
        type: 'legacy',
        gasPrice: max(BigInt(tx.gasPrice), (await client.getGasPrice().catch(() => 0n)) as bigint),
      })
    : serializeTransaction({
        ...common,
        type: 'eip1559',
        maxFeePerGas: max(BigInt(tx.maxFeePerGas ?? '0'), liveFees?.maxFeePerGas ?? 0n),
        maxPriorityFeePerGas: max(
          BigInt(tx.maxPriorityFeePerGas ?? '0'),
          liveFees?.maxPriorityFeePerGas ?? 0n
        ),
      });

  const turnkey = await getTurnkeyClient();
  log('ETH: requesting passkey signature');
  const signResult = await turnkey.signTransaction({
    type: 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2',
    timestampMs: String(Date.now()),
    organizationId: subOrgId,
    parameters: {
      signWith: ethereumAddress,
      unsignedTransaction: unsigned.startsWith('0x') ? unsigned.slice(2) : unsigned,
      type: 'TRANSACTION_TYPE_ETHEREUM',
    },
  });
  const signedTx = signResult?.activity?.result?.signTransactionResult?.signedTransaction;
  if (!signedTx) throw new Error('Signing failed — no signed transaction returned');

  log('ETH: broadcasting');
  // Return as soon as the tx is broadcast — the status modal tracks the
  // receipt + bridge non-blockingly (a dropped/underpriced tx surfaces there
  // as "Failed", not as a frozen button).
  const hash = await client.sendRawTransaction({
    serializedTransaction: (signedTx.startsWith('0x') ? signedTx : `0x${signedTx}`) as `0x${string}`,
  });
  log('ETH: broadcast hash', hash);
  return hash;
}

// --- Bitcoin source ----------------------------------------------------------

async function executeBtc(
  quote: LifiQuote,
  bitcoinAddress: string,
  subOrgId: string
): Promise<string> {
  // The PSBT from LI.FI — signed verbatim, never rebuilt or reordered.
  const psbtHex = quote.transactionRequest.data.startsWith('0x')
    ? quote.transactionRequest.data.slice(2)
    : quote.transactionRequest.data;

  const turnkey = await getTurnkeyClient();
  log('BTC: requesting passkey signature for PSBT');
  const signResult = await turnkey.signTransaction({
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

  log('BTC: broadcasting');
  const res = await fetch('/api/turnkey/broadcast-btc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const signResult = await turnkey.signRawPayload({
    type: 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2',
    timestampMs: String(Date.now()),
    organizationId: subOrgId,
    parameters: {
      signWith: solanaAddress,
      payload: bytesToHex(vtx.message.serialize()),
      encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
      hashFunction: 'HASH_FUNCTION_NOT_APPLICABLE',
    },
  });
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

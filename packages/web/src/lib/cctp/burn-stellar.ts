'use client';

// Outbound burn on Stellar: approve + deposit_for_burn on Circle's
// TokenMessengerMinterV2 (Soroban). Two user signatures — same "1 of 2 /
// 2 of 2" pattern as the savings deposit. Validated end-to-end by the Phase-0
// spike (scripts/cctp-spike/outbound.mjs): total leg ≈ 10s on-chain + ~7s
// attestation.
//
// The caller persists the CctpTransfer row (POST /api/cctp/transfers) BEFORE
// invoking this, and PATCHes the returned burnTxHash immediately after — the
// crash-safety rule that makes every burn recoverable.

import { signStellarTxForMgi } from '@/lib/mgi/kit-signer';
import { type NetworkType, getStellarConfigForNetwork } from '@normalfinance/utils';
import {
  rpc,
  xdr,
  Asset,
  Address,
  Contract,
  Networks,
  nativeToScVal,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import { wireToStellar7 } from './decimals';
import { STELLAR_CCTP, CCTP_MAX_FEE, CCTP_MIN_FINALITY_THRESHOLD } from './config';

export interface StellarBurnParams {
  network: NetworkType;
  /** User's Stellar account (burn source; signs both txs). */
  stellarAddress: string;
  /** Amount in canonical 6-dp wire units. */
  amountWire: bigint;
  /** CCTP domain of the destination chain (e.g. base=6). */
  destinationDomain: number;
  /** 32-byte mint recipient on the destination (evmAddressToBytes for EVM). */
  mintRecipient: Uint8Array;
  /** Progress callback: 'approve' before signature 1, 'burn' before signature 2. */
  onStep?: (step: 'approve' | 'burn') => void;
}

async function submitSigned(server: rpc.Server, signedXdr: string, passphrase: string, label: string) {
  const tx = TransactionBuilder.fromXDR(signedXdr, passphrase);
  const sent = await server.sendTransaction(tx);
  if (sent.status === 'ERROR') {
    throw new Error(`${label} submit failed: ${JSON.stringify(sent.errorResult ?? sent)}`);
  }
  for (let i = 0; i < 60; i++) {
     
    await new Promise((res) => setTimeout(res, 2000));
     
    const res = await server.getTransaction(sent.hash);
    if (res.status === 'SUCCESS') return sent.hash;
    if (res.status === 'FAILED') throw new Error(`${label} failed on-chain (${sent.hash})`);
  }
  throw new Error(`${label} timed out (${sent.hash})`);
}

async function invokeAsUser(params: {
  server: rpc.Server;
  passphrase: string;
  source: string;
  contractId: string;
  method: string;
  args: xdr.ScVal[];
  label: string;
}) {
  const account = await params.server.getAccount(params.source);
  const contract = new Contract(params.contractId);
  let tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: params.passphrase,
  })
    .addOperation(contract.call(params.method, ...params.args))
    .setTimeout(120)
    .build();
  // Simulation surfaces arg/balance errors BEFORE asking for a passkey prompt.
  tx = await params.server.prepareTransaction(tx);
  // Universal signer: Turnkey passkey / local Normal wallet / external kit.
  const signed = await signStellarTxForMgi(tx.toXDR(), params.passphrase, params.source);
  return submitSigned(params.server, signed, params.passphrase, params.label);
}

/** Runs approve + deposit_for_burn. Returns both tx hashes. */
export async function burnUsdcOnStellar(params: StellarBurnParams): Promise<{
  approveTxHash: string;
  burnTxHash: string;
}> {
  const cfg = STELLAR_CCTP[params.network];
  const stellarCfg = getStellarConfigForNetwork(params.network);
  const passphrase = params.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  const server = new rpc.Server(stellarCfg.RPC_URL, {
    allowHttp: stellarCfg.RPC_URL.startsWith('http://'),
  });

  const usdcSac = new Asset('USDC', cfg.usdcIssuer).contractId(passphrase);
  const amount7 = wireToStellar7(params.amountWire); // SAC amounts are 7-dp

  // 1) approve — TokenMessengerMinter pulls the USDC via transfer_from.
  params.onStep?.('approve');
  const { sequence } = await server.getLatestLedger();
  const approveTxHash = await invokeAsUser({
    server,
    passphrase,
    source: params.stellarAddress,
    contractId: usdcSac,
    method: 'approve',
    args: [
      new Address(params.stellarAddress).toScVal(),
      new Address(cfg.tokenMessengerMinter).toScVal(),
      nativeToScVal(amount7, { type: 'i128' }),
      nativeToScVal(sequence + 1000, { type: 'u32' }), // ~1.4h expiry
    ],
    label: 'approve',
  });

  // 2) deposit_for_burn — destinationCaller = 0 (open execution, no lock-in).
  params.onStep?.('burn');
  const burnTxHash = await invokeAsUser({
    server,
    passphrase,
    source: params.stellarAddress,
    contractId: cfg.tokenMessengerMinter,
    method: 'deposit_for_burn',
    args: [
      new Address(params.stellarAddress).toScVal(),
      nativeToScVal(amount7, { type: 'i128' }),
      nativeToScVal(params.destinationDomain, { type: 'u32' }),
      xdr.ScVal.scvBytes(Buffer.from(params.mintRecipient)),
      new Address(usdcSac).toScVal(),
      xdr.ScVal.scvBytes(Buffer.alloc(32)),
      nativeToScVal(CCTP_MAX_FEE, { type: 'i128' }),
      nativeToScVal(CCTP_MIN_FINALITY_THRESHOLD, { type: 'u32' }),
    ],
    label: 'deposit_for_burn',
  });

  return { approveTxHash, burnTxHash };
}

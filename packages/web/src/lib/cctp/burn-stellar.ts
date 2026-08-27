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
  Account,
  Address,
  Contract,
  Networks,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import { wireToStellar7 } from './decimals';
import { STELLAR_CCTP, CCTP_MAX_FEE, CCTP_MIN_FINALITY_THRESHOLD } from './config';

// Persist the burn approval so repeat swaps skip its extra signature: approve a
// large amount with a long (but finite) expiry, and skip re-approving while the
// on-chain allowance still covers this burn. The allowance is only a ceiling —
// transfer_from can never pull more than the user's actual USDC balance — so a
// large value adds no custody risk.
const APPROVE_AMOUNT_7 = 10_000_000_000_000_000n; // 1e16 in 7-dp SAC units (~$1B ceiling)
const APPROVE_EXPIRY_LEDGERS = 500_000; // ≈ 1 month; well under mainnet max_entry_ttl

/** Read the current SAC allowance (0 if none/expired) via a read-only simulate. */
async function readSacAllowance(
  server: rpc.Server,
  usdcSac: string,
  from: string,
  spender: string,
  passphrase: string
): Promise<bigint> {
  try {
    const tx = new TransactionBuilder(new Account(from, '0'), {
      fee: '1000',
      networkPassphrase: passphrase,
      timebounds: { minTime: 0, maxTime: 0 },
    })
      .addOperation(
        new Contract(usdcSac).call(
          'allowance',
          new Address(from).toScVal(),
          new Address(spender).toScVal()
        )
      )
      .build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      return BigInt(scValToNative(sim.result.retval));
    }
  } catch {
    /* treat as no allowance → approve */
  }
  return 0n;
}

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

async function submitSigned(
  server: rpc.Server,
  signedXdr: string,
  passphrase: string,
  label: string
) {
  const tx = TransactionBuilder.fromXDR(signedXdr, passphrase);
  const sent = await server.sendTransaction(tx);
  if (sent.status === 'ERROR') {
    throw new Error(`${label} submit failed: ${JSON.stringify(sent.errorResult ?? sent)}`);
  }
  for (let i = 0; i < 60; i++) {
    await new Promise((res) => setTimeout(res, 2000));

    const res = await server.getTransaction(sent.hash);
    if (res.status === 'SUCCESS') return sent.hash;
    if (res.status === 'FAILED') {
      const err: any = new Error(`${label} failed on-chain (${sent.hash})`);
      err.txHash = sent.hash;
      throw err;
    }
  }
  // The tx may STILL land after our polling window — hand the hash to the
  // caller so the row keeps it (doc 90 W2: a lost hash strands funds).
  const timeoutErr: any = new Error(`${label} timed out (${sent.hash})`);
  timeoutErr.txHash = sent.hash;
  timeoutErr.mayStillLand = true;
  throw timeoutErr;
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
  // Custody invariant: the destination recipient (32-byte EVM address) is fixed
  // HERE, inside the user-signed burn. The relayer only replays this signed
  // message on the destination chain — it can never redirect the funds. Refuse
  // to burn to a zero/invalid recipient (an unrecoverable burn to nowhere).
  if (params.mintRecipient.length !== 32 || params.mintRecipient.every((b) => b === 0)) {
    throw new Error('refusing to burn: invalid mint recipient');
  }

  const cfg = STELLAR_CCTP[params.network];
  const stellarCfg = getStellarConfigForNetwork(params.network);
  const passphrase = params.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  const server = new rpc.Server(stellarCfg.RPC_URL, {
    allowHttp: stellarCfg.RPC_URL.startsWith('http://'),
  });

  const usdcSac = new Asset('USDC', cfg.usdcIssuer).contractId(passphrase);
  const amount7 = wireToStellar7(params.amountWire); // SAC amounts are 7-dp

  // 1) approve — TokenMessengerMinter pulls the USDC via transfer_from. Skip the
  // signature when a prior large, still-valid allowance already covers this burn
  // (transfer_from decrements it, so one approval lasts many swaps).
  let approveTxHash = 'skipped';
  const currentAllowance = await readSacAllowance(
    server,
    usdcSac,
    params.stellarAddress,
    cfg.tokenMessengerMinter,
    passphrase
  );
  if (currentAllowance < amount7) {
    params.onStep?.('approve');
    const { sequence } = await server.getLatestLedger();
    approveTxHash = await invokeAsUser({
      server,
      passphrase,
      source: params.stellarAddress,
      contractId: usdcSac,
      method: 'approve',
      args: [
        new Address(params.stellarAddress).toScVal(),
        new Address(cfg.tokenMessengerMinter).toScVal(),
        nativeToScVal(APPROVE_AMOUNT_7, { type: 'i128' }),
        nativeToScVal(sequence + APPROVE_EXPIRY_LEDGERS, { type: 'u32' }),
      ],
      label: 'approve',
    });
  }

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

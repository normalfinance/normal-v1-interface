import type { Asset, Transaction } from '@stellar/stellar-sdk';

import {
  xdr,
  Account,
  Address,
  Operation,
  nativeToScVal,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import { contractCall } from './permissions';

// ---------------------------------------------------------------------------
// Doc 129 Phase 5c: the pieces of XLM → Savings and Savings → XLM. Pure.
//
// - A Savings deposit as a pre-signed permission. Its tree was read from a
//   mainnet simulation of the real vault (doc 129 §11): `vault.deposit` with
//   one inner call, the USDC transfer from the depositor into the vault.
// - A plain USDC transfer as a permission (a relayed fee: it is the step right
//   after what it charges for, and stops with it).
// - A swap with Normal's 0.5% fee as ONE classic transaction: a path payment
//   on Stellar's own exchange, then the fee payment. Atomic: no swap, no fee.
//   Classic needs no simulation, so it can be signed before the money it
//   spends has arrived, chained by sequence number behind what funds it.
// ---------------------------------------------------------------------------

const i128 = (v: bigint) => nativeToScVal(v, { type: 'i128' });

/** 7-decimal units → a classic amount string ("12.3456789"). */
export function unitsToAmount(units: bigint): string {
  if (units < 0n) throw new Error('negative amount');
  const whole = units / 10_000_000n;
  const frac = (units % 10_000_000n).toString().padStart(7, '0');
  return `${whole}.${frac}`;
}

/** A classic amount ("12.3456789") → 7-decimal units. Truncates past 7 decimals. */
export function amountToUnits(amount: string): bigint {
  const [whole = '0', frac = ''] = amount.trim().split('.');
  return BigInt(whole || '0') * 10_000_000n + BigInt(`${frac}0000000`.slice(0, 7));
}

/** A token transfer through its Stellar Asset Contract: `from` pays `to`. */
export function sacTransferCall(
  sac: string,
  from: string,
  to: string,
  amount: bigint
): xdr.InvokeContractArgs {
  return contractCall(sac, 'transfer', [
    new Address(from).toScVal(),
    new Address(to).toScVal(),
    i128(amount),
  ]);
}

/**
 * A Savings deposit of exactly `amount` (7-decimal USDC), invested as the
 * Savings page does (`invest: true`): the call, and the one inner call the
 * depositor must also allow.
 */
export function vaultDepositPermission(
  vault: string,
  usdcSac: string,
  from: string,
  amount: bigint
): { call: xdr.InvokeContractArgs; inner: xdr.InvokeContractArgs[] } {
  return {
    call: contractCall(vault, 'deposit', [
      xdr.ScVal.scvVec([i128(amount)]),
      xdr.ScVal.scvVec([i128(amount)]),
      new Address(from).toScVal(),
      xdr.ScVal.scvBool(true),
    ]),
    inner: [sacTransferCall(usdcSac, from, vault, amount)],
  };
}

export interface ClassicSwapWithFee {
  /** The account that swaps and pays the fee. */
  source: string;
  /** The sequence number this transaction uses. */
  sequence: bigint;
  networkPassphrase: string;
  path: Asset[];
  /** strict-receive: exactly `destUnits` out, at most `sendUnits` in. strict-send: exactly `sendUnits` in, at least `destUnits` out. */
  mode: 'strict-receive' | 'strict-send';
  sendAsset: Asset;
  sendUnits: bigint;
  destAsset: Asset;
  destUnits: bigint;
  fee: { asset: Asset; units: bigint; to: string };
  /** The network fee per operation, in stroops. */
  baseFee?: string;
  timeoutSeconds: number;
  /**
   * Doc 129 Phase 6 (CAP-21 precondition): valid while the account's own
   * sequence number is at least this and below the transaction's, so using
   * the wallet in between does not break a transaction signed in advance.
   */
  minSequence?: bigint;
}

/**
 * The swap and Normal's fee, one transaction, unsigned. The swap pays the
 * account itself; the fee pays Normal in the coin the person paid with, as a
 * swap does today (doc 129 §11, Niko: "it should pay the fee to us").
 */
export function classicSwapWithFeeTx(p: ClassicSwapWithFee): Transaction {
  const swap =
    p.mode === 'strict-receive'
      ? Operation.pathPaymentStrictReceive({
          sendAsset: p.sendAsset,
          sendMax: unitsToAmount(p.sendUnits),
          destination: p.source,
          destAsset: p.destAsset,
          destAmount: unitsToAmount(p.destUnits),
          path: p.path,
        })
      : Operation.pathPaymentStrictSend({
          sendAsset: p.sendAsset,
          sendAmount: unitsToAmount(p.sendUnits),
          destination: p.source,
          destAsset: p.destAsset,
          destMin: unitsToAmount(p.destUnits),
          path: p.path,
        });
  const builder = new TransactionBuilder(new Account(p.source, (p.sequence - 1n).toString()), {
    fee: p.baseFee ?? '10000',
    networkPassphrase: p.networkPassphrase,
    ...(p.minSequence !== undefined ? { minAccountSequence: p.minSequence.toString() } : {}),
  }).addOperation(swap);
  if (p.fee.units > 0n) {
    builder.addOperation(
      Operation.payment({
        destination: p.fee.to,
        asset: p.fee.asset,
        amount: unitsToAmount(p.fee.units),
      })
    );
  }
  return builder.setTimeout(p.timeoutSeconds).build();
}

/** A plain classic payment at the given sequence number, unsigned (a commission). */
export function classicPaymentTx(p: {
  source: string;
  sequence: bigint;
  networkPassphrase: string;
  asset: Asset;
  units: bigint;
  to: string;
  baseFee?: string;
  timeoutSeconds: number;
}): Transaction {
  return new TransactionBuilder(new Account(p.source, (p.sequence - 1n).toString()), {
    fee: p.baseFee ?? '10000',
    networkPassphrase: p.networkPassphrase,
  })
    .addOperation(
      Operation.payment({ destination: p.to, asset: p.asset, amount: unitsToAmount(p.units) })
    )
    .setTimeout(p.timeoutSeconds)
    .build();
}

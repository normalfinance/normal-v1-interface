import {
  rpc,
  xdr,
  Account,
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import { CCTP_MAX_FEE, CCTP_MIN_FINALITY_THRESHOLD } from './config';

// ---------------------------------------------------------------------------
// The two Stellar calls of an outbound Circle transfer, built in ONE place so
// the passkey path (lib/cctp/burn-stellar.ts, the person's own transactions)
// and the permission path (doc 129 Phase 3, the relayer's transactions with
// the person's signed permission) can never encode them differently.
// ---------------------------------------------------------------------------

/** USDC SAC `approve(from, spender, amount, expiration_ledger)`. */
export function approveArgs(
  from: string,
  spender: string,
  amount7: bigint,
  expirationLedger: number
): xdr.ScVal[] {
  return [
    new Address(from).toScVal(),
    new Address(spender).toScVal(),
    nativeToScVal(amount7, { type: 'i128' }),
    nativeToScVal(expirationLedger, { type: 'u32' }),
  ];
}

/**
 * TokenMessengerMinter `deposit_for_burn(caller, amount, destination_domain,
 * mint_recipient, burn_token, destination_caller, max_fee,
 * min_finality_threshold)`. destination_caller is zero: open execution.
 */
export function depositForBurnArgs(p: {
  caller: string;
  amount7: bigint;
  destinationDomain: number;
  /** 32 bytes: the EVM address left-padded (evmAddressToBytes). */
  mintRecipient: Uint8Array;
  usdcSac: string;
}): xdr.ScVal[] {
  if (p.mintRecipient.length !== 32 || p.mintRecipient.every((b) => b === 0)) {
    throw new Error('refusing to burn: invalid mint recipient');
  }
  return [
    new Address(p.caller).toScVal(),
    nativeToScVal(p.amount7, { type: 'i128' }),
    nativeToScVal(p.destinationDomain, { type: 'u32' }),
    xdr.ScVal.scvBytes(Buffer.from(p.mintRecipient)),
    new Address(p.usdcSac).toScVal(),
    xdr.ScVal.scvBytes(Buffer.alloc(32)),
    nativeToScVal(CCTP_MAX_FEE, { type: 'i128' }),
    nativeToScVal(CCTP_MIN_FINALITY_THRESHOLD, { type: 'u32' }),
  ];
}

/** Read the current SAC allowance (0 if none/expired) via a read-only simulate. */
export async function readSacAllowance(
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

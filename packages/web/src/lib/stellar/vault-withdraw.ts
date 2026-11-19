import { Address, scValToNative, type Transaction } from '@stellar/stellar-sdk';

// ---------------------------------------------------------------------------
// Doc 129 Phase 5b: a DeFindex vault withdrawal, read from the transaction
// itself. The vault contract has one way out (paltalabs/defindex
// apps/contracts/vault/src/lib.rs):
//
//   withdraw(withdraw_shares: i128, min_amounts_out: Vec<i128>, from: Address)
//
// It burns the shares and pays `total_amount × shares ÷ total_supply` of each
// asset, and fails outright (InsufficientOutputAmount) when that is below
// `min_amounts_out`. So the minimum written into a signed withdrawal is a hard
// floor on what it pays, whoever built it (DeFindex's API builds ours).
// ---------------------------------------------------------------------------

export interface VaultWithdrawCall {
  shares: bigint;
  /** The vault pays at least this, in 7-decimal units of its one asset, or the call fails. */
  minOut: bigint;
  from: string;
}

/**
 * Pure: the transaction as exactly one `withdraw` call on `vault`, a
 * single-asset vault, by the transaction's own source account; null for
 * anything else.
 */
export function vaultWithdrawOf(tx: Transaction, vault: string): VaultWithdrawCall | null {
  if (tx.operations.length !== 1) return null;
  const op = tx.operations[0];
  if (op.type !== 'invokeHostFunction') return null;
  try {
    if (op.func.switch().name !== 'hostFunctionTypeInvokeContract') return null;
    const call = op.func.invokeContract();
    if (Address.fromScAddress(call.contractAddress()).toString() !== vault) return null;
    if (call.functionName().toString() !== 'withdraw') return null;
    const args = call.args();
    if (args.length !== 3) return null;
    const [sharesVal, minsVal, fromVal] = args;
    if (sharesVal.switch().name !== 'scvI128') return null;
    if (minsVal.switch().name !== 'scvVec') return null;
    const mins = minsVal.vec() ?? [];
    if (mins.length !== 1 || mins[0].switch().name !== 'scvI128') return null;
    if (fromVal.switch().name !== 'scvAddress') return null;
    const shares = BigInt(scValToNative(sharesVal));
    const minOut = BigInt(scValToNative(mins[0]));
    const from = Address.fromScVal(fromVal).toString();
    if (shares <= 0n || minOut <= 0n || from !== tx.source) return null;
    return { shares, minOut, from };
  } catch {
    return null;
  }
}

/** The DeFindex vault behind Savings on this network (public, from the build). */
export function savingsVaultOf(network: 'mainnet' | 'testnet'): string {
  return (
    (network === 'mainnet'
      ? process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT
      : process.env.NEXT_PUBLIC_TESTNET_DEFINDEX_VAULT) ?? ''
  );
}

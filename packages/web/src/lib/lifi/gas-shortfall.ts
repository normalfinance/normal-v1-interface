// Layer 2 of the dynamic-gas design (Niko GO 2026-08-21): gas is a live
// market price, so any pre-computed reserve can be beaten by a spike between
// quote and send. Instead of letting the node throw its RPC dump, the ETH
// execute path checks affordability BEFORE the passkey ceremony and raises
// THIS structured error — engines turn it into a one-tap "use the affordable
// amount" prompt. Nothing has been signed when this fires; aborting is free.

export interface AffordabilityInput {
  /** wallet balance in wei */
  balanceWei: bigint;
  /** tx value (the ETH being swapped) in wei */
  valueWei: bigint;
  /** gas limit for the tx */
  gasLimit: bigint;
  /** price the node will require reserved per gas unit (maxFeePerGas for
   *  eip1559, gasPrice for legacy) */
  feePerGas: bigint;
}

export interface AffordabilityResult {
  affordable: boolean;
  /** worst-case wei the node requires: value + gasLimit×feePerGas */
  costWei: bigint;
  /** gas budget alone, in wei */
  gasWei: bigint;
  /** most wei of VALUE the balance can carry right now (balance − gas, ≥ 0) */
  maxAffordableWei: bigint;
  /** how much the requirement exceeds the balance (0 when affordable) */
  shortfallWei: bigint;
}

/** The node's own admission rule, computed locally: balance must cover
 *  value + gasLimit × feePerGas. Pure — jest pins the edge cases. */
export function computeAffordability(input: AffordabilityInput): AffordabilityResult {
  const gasWei = input.gasLimit * input.feePerGas;
  const costWei = input.valueWei + gasWei;
  const affordable = input.balanceWei >= costWei;
  const headroom = input.balanceWei - gasWei;
  return {
    affordable,
    costWei,
    gasWei,
    maxAffordableWei: headroom > 0n ? headroom : 0n,
    shortfallWei: affordable ? 0n : costWei - input.balanceWei,
  };
}

export class GasShortfallError extends Error {
  constructor(public readonly info: AffordabilityResult & { balanceWei: bigint }) {
    super(
      `insufficient ETH for value+gas: balance ${info.balanceWei} wei, ` +
        `needs ${info.costWei} wei (short ${info.shortfallWei})`
    );
    this.name = 'GasShortfallError';
  }
}

/** The affordable swap amount as a decimal-ETH string, rounded DOWN so the
 *  suggestion can never itself be unaffordable at the same price. */
export function maxAffordableEth(err: GasShortfallError, decimals = 8): string {
  const wei = err.info.maxAffordableWei;
  const s = wei.toString().padStart(19, '0');
  const whole = s.slice(0, -18) || '0';
  const frac = s.slice(-18).slice(0, decimals);
  return `${whole}.${frac}`.replace(/\.?0+$/, '') || '0';
}

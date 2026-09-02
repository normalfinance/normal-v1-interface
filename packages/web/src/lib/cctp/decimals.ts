// USDC decimal conversions for CCTP.
//
// The CCTP wire format always carries SIX-decimal amounts (USDC's native
// precision on EVM/Solana). Stellar's USDC uses SEVEN decimals. Rules, per
// Circle's Stellar reference:
//   - Stellar → other chains: only whole 6-dp units can be burned; any
//     7th-decimal dust must stay with the user (we truncate and report it).
//   - Other chains → Stellar: the 6-dp wire amount is scaled ×10 on mint.
// Every amount in the CCTP data model is stored as a 6-dp integer string
// ("wire units") — convert at the edges only, through this module.

/** Parse a human USDC amount ("12.34") into 6-dp wire units. Throws on more
 *  than 6 decimals — the caller should round/validate user input first. */
export function usdcToWire(amount: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error(`invalid USDC amount: ${amount}`);
  const [whole, frac = ''] = amount.split('.');
  if (frac.length > 6) throw new Error(`USDC supports at most 6 decimals: ${amount}`);
  return BigInt(whole) * 1_000_000n + BigInt(frac.padEnd(6, '0'));
}

/** Wire units → human string ("12.34"). */
export function wireToUsdc(wire: bigint): string {
  const whole = wire / 1_000_000n;
  const frac = (wire % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** Wire units → Stellar SAC 7-dp units (mint direction: scale ×10). */
export function wireToStellar7(wire: bigint): bigint {
  return wire * 10n;
}

/** Stellar 7-dp units → wire units for a burn. Truncates the 7th decimal;
 *  returns the dust that stays behind so callers can surface it. */
export function stellar7ToWire(amount7: bigint): { wire: bigint; dust7: bigint } {
  return { wire: amount7 / 10n, dust7: amount7 % 10n };
}

/** Stellar balance string ("12.3456789", 7dp) → 7-dp integer units. */
export function stellarBalanceTo7dp(balance: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(balance)) throw new Error(`invalid Stellar balance: ${balance}`);
  const [whole, frac = ''] = balance.split('.');
  if (frac.length > 7) throw new Error(`Stellar amounts have at most 7 decimals: ${balance}`);
  return BigInt(whole) * 10_000_000n + BigInt(frac.padEnd(7, '0'));
}

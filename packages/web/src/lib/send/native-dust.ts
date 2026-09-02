// Native-asset dust rules for sends (2026-08-26, after a live MAX-send
// failure): Solana forbids leaving an account with MORE than zero but LESS
// than the rent-exempt minimum — a send computed from display-rounded digits
// (8dp of a 9dp asset) stranded 9 lamports and the network rejected the
// whole transaction with InsufficientFundsForRent. All MAX/remainder math
// for SOL lives here, in integer lamports, shared by the adapter (client)
// and the broadcast funnel (server). NO 'use client' — both sides import it.

export const SOL_FEE_LAMPORTS = 5000n; // base fee, single-signature transfer
/** getMinimumBalanceForRentExemption(0) — verified live on mainnet 2026-08-26. */
export const SOL_RENT_MIN_LAMPORTS = 890880n;

export const SOL_RENT_DUST_MESSAGE =
  'This send would leave a tiny amount below Solana\u2019s minimum balance (~0.00089 SOL). ' +
  'Use MAX to send everything, or leave at least 0.001 SOL.';

export const SOL_INSUFFICIENT_MESSAGE =
  'Amount plus the 0.000005 SOL network fee exceeds your balance \u2014 use MAX or reduce the amount.';

/** The most SOL an account can send: everything minus the fee, leaving the
 *  account at EXACTLY zero (which Solana allows — the forbidden zone is
 *  strictly between 0 and the rent minimum). */
export function solMaxSendLamports(balanceLamports: bigint): bigint {
  const max = balanceLamports - SOL_FEE_LAMPORTS;
  return max > 0n ? max : 0n;
}

export type SolRemainderVerdict = 'ok' | 'insufficient' | 'rent-dust';

/** Classify what a send would leave behind: 'insufficient' (amount + fee
 *  over balance), 'rent-dust' (the forbidden 0 < r < rent-min zone the
 *  network hard-rejects), or 'ok' (exactly zero, or rent-exempt). */
export function checkSolRemainder(
  balanceLamports: bigint,
  sendLamports: bigint
): SolRemainderVerdict {
  const remainder = balanceLamports - sendLamports - SOL_FEE_LAMPORTS;
  if (remainder < 0n) return 'insufficient';
  if (remainder === 0n) return 'ok';
  return remainder < SOL_RENT_MIN_LAMPORTS ? 'rent-dust' : 'ok';
}

/** Exact decimal string for a lamport amount (no float math, trailing zeros
 *  trimmed) — 9dp precision the display layer must never re-round away. */
export function lamportsToSolString(lamports: bigint): string {
  const s = lamports.toString().padStart(10, '0');
  const whole = s.slice(0, -9);
  const frac = s.slice(-9).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

// --- Bitcoin -----------------------------------------------------------------

/** Outputs below this are non-standard and rejected by the network. */
export const BTC_DUST_LIMIT_SAT = 546;

export const BTC_DUST_MESSAGE =
  'Bitcoin rejects amounts below 546 sats (~0.00000546 BTC) \u2014 send a larger amount.';

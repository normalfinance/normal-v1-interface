// Doc 95 Wave 2 + regression fix 2026-08-27: the ONE pre-sign invariant that
// holds for every bridge — a Bitcoin swap must not SPEND materially more than
// it quoted.
//
// Structure-agnostic on purpose. The first version of this check assumed a
// single destination output and refused every real swap; decoding an actual
// LI.FI PSBT showed FIVE outputs (bridge deposit, OP_RETURN memo, our change,
// the route's protocol fee, and our own integrator-fee wallet), and the shape
// differs per route. Counting outputs is not a safe invariant; this is.
//
// Its own module, with zero imports, so it can be unit-tested without pulling
// the signer's Turnkey/Supabase dependency chain into jest.

export interface PsbtSpendVerdict {
  ok: boolean;
  /** Sats actually leaving this wallet: inputs minus what comes back to us. */
  spent: bigint;
  /** The most we accept for this quote (amount + fee headroom). */
  limit: bigint;
}

export function psbtSpendVerdict(args: {
  inputsTotalSat: bigint;
  backToUsSat: bigint;
  quotedSat: bigint;
}): PsbtSpendVerdict {
  const spent = args.inputsTotalSat - args.backToUsSat;
  // Headroom covers the miner fee plus route/integrator fees. Measured against
  // a real quote: a 37,965 sat swap spent 39,203 (+3.3%). The floor keeps
  // small swaps — where the miner fee dominates — from tripping it.
  const quarter = args.quotedSat / 4n;
  const allowance = quarter > 10_000n ? quarter : 10_000n;
  const limit = args.quotedSat + allowance;
  return { ok: spent >= 0n && spent <= limit, spent, limit };
}

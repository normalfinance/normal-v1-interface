// ---------------------------------------------------------------------------
// LI.FI's ids for the chains we swap on, in one light module: the swap engine
// (lib/lifi/execute.ts) signs by them, and the pages that follow a swap or an
// index purchase ask LI.FI's status by them, without loading the engine.
// ---------------------------------------------------------------------------

export const LIFI_CHAIN_IDS = {
  ETH: 1,
  SOL: 1151111081099710,
  BTC: 20000000000001,
} as const;

/** Base, where an index purchase's coins are bought. */
export const BASE_LIFI_CHAIN_ID = 8453;

// Failure CLASSIFICATION for the CCTP outbound pivot (Niko 2026-08-26 GO):
// an on-chain REVERT is not a signing problem — retrying the signature layer
// (autopilot -> interactive passkey) just burns a biometric prompt on a route
// that will revert again. These helpers give every layer (autopilot route,
// engine, banner, PATCH route) ONE grammar for recording which bridge failed,
// so the automatic bridge FAILOVER (retry quoting with that bridge excluded)
// can parse it back out. The bridge itself is never removed from routing
// (Niko: "i dont want to remove the bridge") — the exclusion lives only
// inside the retry of the transfer that just failed on it.

const TOOL_RE = /^[a-zA-Z0-9_-]{1,32}$/;
// Anchored to OUR canonical sentence — a bare "via <word>" match would
// false-match unrelated errorDetail copy and "exclude" a bridge that never
// failed.
const DETAIL_TOOL_RE = /route failed on Base via ([a-zA-Z0-9_-]{1,32})/;
const HASH_RE = /^0x[0-9a-fA-F]{64}$/;

/** LI.FI tool keys are short slugs (e.g. "mayan", "relay"); anything else
 *  (injection attempts, objects, overlong strings) drops to null. */
export function sanitizeTool(raw: unknown): string | null {
  return typeof raw === 'string' && TOOL_RE.test(raw) ? raw : null;
}

export function sanitizeTxHash(raw: unknown): string | null {
  return typeof raw === 'string' && HASH_RE.test(raw) ? raw : null;
}

/** The canonical errorDetail for a reverted pivot — human-readable AND
 *  machine-parseable ("route failed on Base via <tool>" is the contract
 *  parseFailedTool reads back; keep them in lockstep). */
export function pivotRevertDetail(tool?: string | null, txHash?: string | null): string {
  const t = sanitizeTool(tool);
  const h = sanitizeTxHash(txHash);
  return `Exchange route failed on Base${t ? ` via ${t}` : ''}${
    h ? ` (${h})` : ''
  } — your USDC is still in your own account`;
}

/** Reads the failed bridge back out of a row's errorDetail (null if none). */
export function parseFailedTool(errorDetail: string | null | undefined): string | null {
  if (!errorDetail) return null;
  return DETAIL_TOOL_RE.exec(errorDetail)?.[1] ?? null;
}

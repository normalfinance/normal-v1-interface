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

/** Bounded list of tool slugs (junk entries silently dropped). */
export function sanitizeToolList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizeTool)
    .filter((x): x is string => !!x)
    .slice(0, 4);
}

/** The canonical errorDetail for a reverted pivot — human-readable AND
 *  machine-parseable ("route failed on Base via <tool>" is the contract
 *  parseFailedTool reads back; keep them in lockstep). */
export function pivotRevertDetail(
  tool?: string | null,
  txHash?: string | null,
  exchanges?: unknown
): string {
  const t = sanitizeTool(tool);
  const h = sanitizeTxHash(txHash);
  // 2026-08-26 forensic: the poisoned element can be a DEX step INSIDE the
  // route (a fake token pool), not the bridge — record those too so retries
  // can deny them ("through <dex1>+<dex2>").
  const ex = sanitizeToolList(exchanges);
  return `Exchange route failed on Base${t ? ` via ${t}` : ''}${
    ex.length ? ` through ${ex.join('+')}` : ''
  }${h ? ` (${h})` : ''} — your USDC is still in your own account`;
}

/** Reads the failed bridge back out of a row's errorDetail (null if none). */
export function parseFailedTool(errorDetail: string | null | undefined): string | null {
  if (!errorDetail) return null;
  return DETAIL_TOOL_RE.exec(errorDetail)?.[1] ?? null;
}

const DETAIL_EXCH_RE = / through ([a-zA-Z0-9_+-]{1,140})/;

/** Reads the failed DEX steps back out of a row's errorDetail ([] if none). */
export function parseFailedExchanges(errorDetail: string | null | undefined): string[] {
  if (!errorDetail) return [];
  const m = DETAIL_EXCH_RE.exec(errorDetail);
  return m ? sanitizeToolList(m[1].split('+')) : [];
}

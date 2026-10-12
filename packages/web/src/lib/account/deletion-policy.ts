// ---------------------------------------------------------------------------
// Account deletion — the pure rules (App Store guideline 5.1.1(v) requires
// in-app deletion; this is what "safe to delete" means for a self-custody
// wallet). The route is thin so these decisions are testable without the DB,
// Turnkey or the chains.
//
// Three gates, in the order the route applies them:
//   1. EXPORT_REQUIRED — every Turnkey wallet (seed) must have a COMPLETED
//      EXPORT_WALLET activity recent enough to count as "the user saw their
//      recovery phrase as part of deleting" (Niko, 2026-10-12: deletion must
//      give the user the passphrase). Never overridable: once the Normal
//      account is gone, the phrase is the only key to the funds.
//   2. IN_FLIGHT — nothing mid-transit (CCTP, ramp, MoneyGram). Never
//      overridable: deleting the owner of money in motion is unrecoverable.
//   3. FUNDS_PRESENT — balances above dust. Overridable with an explicit
//      `override: true`, for a user who accepts that only the exported phrase
//      reaches the funds from now on.
// ---------------------------------------------------------------------------

/** How recent a completed export must be to count for THIS deletion. */
export const EXPORT_FRESHNESS_MS = 24 * 60 * 60 * 1000;

export interface ExportActivity {
  walletId: string;
  status: string;
  createdAtMs: number;
}

/** Wallet ids that still need a fresh, completed export. Empty = satisfied. */
export function walletsMissingExport(
  walletIds: string[],
  activities: ExportActivity[],
  nowMs = Date.now()
): string[] {
  const fresh = new Set(
    activities
      .filter(
        (a) =>
          a.status === 'ACTIVITY_STATUS_COMPLETED' &&
          Number.isFinite(a.createdAtMs) &&
          nowMs - a.createdAtMs <= EXPORT_FRESHNESS_MS &&
          a.createdAtMs <= nowMs + 5 * 60_000 // small clock skew ok; future-dated junk is not
      )
      .map((a) => a.walletId)
  );
  return walletIds.filter((id) => !fresh.has(id));
}

/** Turnkey timestamps are { seconds, nanos } strings. */
export function turnkeyTimestampMs(
  ts: { seconds?: string; nanos?: string } | null | undefined
): number {
  const s = Number(ts?.seconds ?? NaN);
  if (!Number.isFinite(s)) return NaN;
  const n = Number(ts?.nanos ?? 0) || 0;
  return s * 1000 + Math.floor(n / 1_000_000);
}

// ---- Funds -----------------------------------------------------------------

/** Below these the asset is dust: unsendable or worth cents. XLM keeps the
 *  1.5 XLM base reserve (account + USDC trustline) that can never leave anyway. */
export const DUST: Record<string, number> = {
  XLM: 1.6,
  USDC: 0.5,
  BTC: 0.00002,
  ETH: 0.0005,
  SOL: 0.001,
  SAVINGS_USDC: 0.5,
};

export interface HeldBalance {
  symbol: string; // XLM | USDC | BTC | ETH | SOL | SAVINGS_USDC
  chain: string;
  balance: number | null; // null = could not be read
}

export interface FundsVerdict {
  present: HeldBalance[];
  unreadable: HeldBalance[];
}

/** Which balances block deletion, and which could not be read (treated as
 *  blocking too: "we could not check" must never read as "nothing there"). */
export function fundsVerdict(balances: HeldBalance[]): FundsVerdict {
  const present: HeldBalance[] = [];
  const unreadable: HeldBalance[] = [];
  for (const b of balances) {
    if (b.balance === null || !Number.isFinite(b.balance)) {
      unreadable.push(b);
      continue;
    }
    const dust = DUST[b.symbol] ?? 0;
    if (b.balance > dust) present.push(b);
  }
  return { present, unreadable };
}

// ---- In flight -------------------------------------------------------------

export const CCTP_TERMINAL = new Set(['COMPLETED', 'FAILED', 'REFUNDED']);

export interface InFlightCounts {
  cctp: number;
  ramp: number;
  moneygram: number;
}

export function hasInFlight(c: InFlightCounts): boolean {
  return c.cctp > 0 || c.ramp > 0 || c.moneygram > 0;
}

// ---- Anonymisation -----------------------------------------------------------

/** Money-history rows keep a stable but unlinkable owner key so fee accounting
 *  and the Dune dashboard still add up after the person is gone. */
export function anonymousOwnerKey(supabaseUid: string, digestHex: string): string {
  if (!supabaseUid) throw new Error('uid required');
  return `deleted:${digestHex.slice(0, 16)}`;
}

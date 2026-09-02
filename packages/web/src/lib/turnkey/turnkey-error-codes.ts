// Turnkey error shapes we must ACT on rather than surface.

/** Turnkey error 6 — "path already exists in wallet account <id>".
 *
 *  The derivation path is already on the wallet, i.e. the account EXISTS and
 *  only our DB is behind: a previous attempt created it at Turnkey and died
 *  before the sync. Creating is not the goal — HAVING the address is — so
 *  this is a signal to go read what is there, never a failure to report.
 *
 *  Live 2026-08-22: without this, "Set up Ethereum wallet" threw error 6 on
 *  every click forever. Turnkey held 0x31d889B6… while the gate insisted the
 *  address did not exist, and no amount of retrying could ever agree.
 */
export function isPathAlreadyExistsError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e ?? '');
  return /path already exists/i.test(msg) || /error 6\b/i.test(msg);
}

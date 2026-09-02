// ---------------------------------------------------------------------------
// Which cctp transfer THIS TAB's progress modal is actively working, if any.
// The recovery banner hides that one transfer — a live, healthy flow must not
// offer a second entrance (Niko 2026-08-19) — and shows it again the moment
// the engine clears the signal: on error, on done, or on unmount. A closed
// tab never sets it, so orphaned transfers always surface for recovery. The
// old 2-minute grace timer guessed at this and guessed wrong on slow chains
// (BTC legs run ~1h).
// ---------------------------------------------------------------------------

let activeId: string | null = null;

export const ACTIVE_CCTP_TRANSFER_EVENT = 'nf:cctp-active-transfer';

export function setActiveCctpTransfer(id: string | null): void {
  activeId = id;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ACTIVE_CCTP_TRANSFER_EVENT));
}

export function getActiveCctpTransfer(): string | null {
  return activeId;
}

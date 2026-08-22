// Does THIS run get server-side signing?
//
// The engine used to answer by reading /api/autopilot/status immediately
// before each Base leg. That read is authoritative but it is a SNAPSHOT, and
// a grant that lands after it cannot change the leg — so a user who enabled
// autopilot (at swap start, or from the "this swap finishes by itself" box
// inside the progress modal) still got the interactive prompts for the run
// they enabled it FOR, and only saw the benefit on their next swap. Live
// 2026-08-22; the in-modal copy promises the current swap outright.
//
// The gate makes a successful grant STICKY for the run: once the ceremony has
// returned (it verifies the Turnkey policy exists before resolving), the
// answer is yes and no later read can walk it back. Trusting it optimistically
// is safe because the server re-checks everything and the caller falls back to
// the interactive path whenever the autopilot call fails — an optimistic yes
// costs one refused request, never a wrong signature.

export interface AutopilotGate {
  /** Record a completed consent ceremony (either door). */
  markGranted(): void;
  /** True when this run may use server-side signing. */
  isActive(): Promise<boolean>;
}

export function createAutopilotGate(check: () => Promise<boolean>): AutopilotGate {
  let granted = false;
  return {
    markGranted() {
      granted = true;
    },
    async isActive() {
      // Deliberately skips the status read: that read is exactly what lagged.
      if (granted) return true;
      return check();
    },
  };
}

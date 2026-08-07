'use client';

// ---------------------------------------------------------------------------
// Serializes WebAuthn ceremonies and absorbs the transient NotAllowedError.
//
// THE BUG (recurring on staging): savings deposit/withdraw signs TWO
// transactions back-to-back (fee payment, then the vault op) — two passkey
// ceremonies in quick succession. Browsers (Chrome + Windows Hello above all)
// reject a `navigator.credentials.get()` that starts while a previous native
// dialog is still tearing down, or while another request is pending in the
// tab, with the deliberately vague:
//   "The operation either timed out or was not allowed."
// The rejection is INSTANT — the user never saw a prompt — and a retry always
// succeeds, because there is nothing left to collide with.
//
// THE FIX, three layers:
//  1. A queue: our code never runs two ceremonies concurrently.
//  2. A settle delay between queued ceremonies, so the platform dialog's
//     teardown finishes before the next prompt appears.
//  3. One silent retry — but ONLY when the failure was fast (< FAST_FAIL_MS).
//     A fast NotAllowedError means the environment refused before any human
//     saw a dialog; a slow one means the user saw it and cancelled or let it
//     expire, and silently re-prompting after a deliberate cancel is hostile.
//
// When the error still surfaces, it is rethrown with a message a human can
// act on, with the original attached as `cause`.
// ---------------------------------------------------------------------------

const FAST_FAIL_MS = 2_000;
const SETTLE_MS = 350;
const RETRY_DELAY_MS = 500;

export const WEBAUTHN_FRIENDLY_MESSAGE =
  'The passkey confirmation did not complete. Please try again.';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isNotAllowed(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  return (
    e?.name === 'NotAllowedError' ||
    /operation either timed out or was not allowed/i.test(e?.message ?? '')
  );
}

// Queue tail. Each ceremony chains onto the previous one's settlement, so at
// most one `credentials.get()` from our code is in flight per tab.
let tail: Promise<unknown> = Promise.resolve();

async function attempt<T>(ceremony: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    return await ceremony();
  } catch (error) {
    const elapsed = Date.now() - started;
    if (isNotAllowed(error) && elapsed < FAST_FAIL_MS) {
      // Refused before any human interaction — teardown/collision noise.
      // One quiet retry after the platform has had a moment to settle.
      console.warn(`[webauthn-guard] ceremony fast-failed after ${elapsed}ms — retrying once`);
      await sleep(RETRY_DELAY_MS);
      return ceremony();
    }
    throw error;
  }
}

/**
 * Run a WebAuthn ceremony (any Turnkey signing call that will pop a passkey
 * prompt) serialized against all others, with the fast-failure retry.
 */
export function runWebauthnCeremony<T>(ceremony: () => Promise<T>): Promise<T> {
  const run = tail
    // Previous ceremony settled (either way); give the native dialog time to
    // tear down before the next one appears.
    .catch(() => {})
    .then(() => sleep(SETTLE_MS))
    .then(() => attempt(ceremony))
    .catch((error) => {
      if (isNotAllowed(error)) {
        throw new Error(WEBAUTHN_FRIENDLY_MESSAGE, { cause: error });
      }
      throw error;
    });
  tail = run.catch(() => {});
  return run;
}

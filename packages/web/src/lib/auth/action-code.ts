'use client';

import { supabase } from '@/lib/createSupabaseClient';

import {
  assuranceLevel,
  secondsSinceCode,
  hasVerifiedFactor,
  ACTION_CODE_REUSE_SECONDS,
} from './two-factor';

// ---------------------------------------------------------------------------
// The 6-digit code before anything that spends or exposes a wallet. Accounts
// without 2FA pass straight through.
//
// Called once at the start of an action, not in createPasskeyStamper: that runs
// per signature, and a swap can have several. It sits at the primitive, not the
// button, so a new caller can't forget it. Finishing a swap or bringing funds
// back never asks: a lost phone must not be able to strand money mid-flight.
//
// This stops anyone using Normal. It can't stop someone who has the passkey and
// a live session and writes their own client: signatures go from the browser to
// Turnkey, and the passkey sits above Turnkey's policies. The server repeats the
// check on the routes that spend (actionCodeRefusal).
// ---------------------------------------------------------------------------

type CodePrompt = () => Promise<boolean>;

let prompt: CodePrompt | null = null;
let checking = false;

/** ActionCodeGate, mounted once for the whole app, shows the screen. */
export function registerActionCodePrompt(next: CodePrompt | null): void {
  prompt = next;
}

/**
 * False means stop: nothing has happened and nothing should. It's also false for
 * a second press while the first is still being checked. Without that, the
 * network call below would open a gap for a double click to start two swaps.
 */
export async function confirmAction(): Promise<boolean> {
  if (checking) return false;
  checking = true;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return true;

    // Asks Supabase, so 2FA changed in another browser counts here too.
    const { data } = await supabase.auth.mfa.listFactors();
    const usesCode = data ? data.totp.length > 0 : hasVerifiedFactor(session.user);
    if (!usesCode) return true;

    const age = secondsSinceCode(session.access_token);
    if (age !== null && age <= ACTION_CODE_REUSE_SECONDS) return true;

    return prompt ? await prompt() : false;
  } finally {
    checking = false;
  }
}

/** Whether this login came through a code, from the token so no request is needed. */
export async function usesSecondFactor(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return assuranceLevel(session?.access_token) === 'aal2';
}

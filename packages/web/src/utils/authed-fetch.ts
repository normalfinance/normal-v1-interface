'use client';

// Doc 90 Wave 1a: THE authed fetch. On a 401 it silently refreshes the
// Supabase session and retries ONCE; if the request is still unauthorized it
// raises the single app-wide session-expired signal (the provider renders
// the one honest banner). Callers stop inventing their own cryptic 401
// behaviours — "challenge failed: 401", vanished banners, dead buttons.

import { buildAuthHeaders } from '@/utils/http';
import { supabase } from '@/lib/createSupabaseClient';
import { MFA_REQUIRED_ERROR } from '@/lib/auth/two-factor';

export const SESSION_EXPIRED_EVENT = 'nf:session-expired';
export const MFA_REQUIRED_EVENT = 'nf:mfa-required';

let lastSignalMs = 0;

export async function authedFetch(input: string, init?: RequestInit): Promise<Response> {
  const doFetch = async () =>
    fetch(input, {
      ...init,
      headers: { ...(await buildAuthHeaders()), ...(init?.headers ?? {}) },
      credentials: 'include',
    });

  let res = await doFetch();
  if (res.status === 401) {
    try {
      const { data } = await supabase.auth.refreshSession();
      if (data.session) res = await doFetch();
    } catch {
      /* refresh unavailable — fall through to the signal */
    }
    if (res.status === 401 && typeof window !== 'undefined') {
      // Debounced: ten failing calls must not stack ten banners.
      const now = Date.now();
      if (now - lastSignalMs > 5_000) {
        lastSignalMs = now;
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
    }
  }
  if (res.status === 403 && typeof window !== 'undefined') {
    const body = await res
      .clone()
      .json()
      .catch(() => null);
    if (body?.error === MFA_REQUIRED_ERROR) window.dispatchEvent(new Event(MFA_REQUIRED_EVENT));
  }
  return res;
}

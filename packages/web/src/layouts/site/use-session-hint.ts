'use client';

import { useState, useEffect } from 'react';

// ----------------------------------------------------------------------

// supabase-js keeps the session in localStorage as `sb-<project>-auth-token`.
// The marketing site doesn't load the auth client, so it reads that entry to
// choose the header's buttons and draw the avatar. /app checks the session for
// real and sends an expired one to sign-in.
const SESSION_KEY = /^sb-.+-auth-token$/;

export type SessionHint = {
  signedIn: boolean;
  /** Full name, else the email: what the avatar's initial comes from. */
  name: string | null;
  avatarUrl: string | null;
};

const SIGNED_OUT: SessionHint = { signedIn: false, name: null, avatarUrl: null };

export function useSessionHint(): SessionHint {
  const [hint, setHint] = useState<SessionHint>(SIGNED_OUT);

  useEffect(() => {
    try {
      const key = Object.keys(window.localStorage).find((k) => SESSION_KEY.test(k));
      if (!key) return;
      const session = JSON.parse(window.localStorage.getItem(key) ?? 'null');
      const user = session?.user;
      if (!user) return;
      const meta = user.user_metadata ?? {};
      setHint({
        signedIn: true,
        name: meta.full_name || meta.name || user.email || null,
        avatarUrl: meta.avatar_url || meta.picture || null,
      });
    } catch {
      // Storage blocked or the entry unreadable: show the signed-out buttons.
    }
  }, []);

  return hint;
}

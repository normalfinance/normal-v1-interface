'use client';

import type { User, Session } from '@supabase/supabase-js';

import { clearLoginIntent } from '@/lib/loginIntent';
import { supabase } from '@/lib/createSupabaseClient';
import { MFA_REQUIRED_EVENT } from '@/utils/authed-fetch';
import { needsSecondFactor } from '@/lib/auth/two-factor';
import { clearStoredSession } from '@/lib/supabase-config';
import { isAuthPage, loginHrefFrom } from '@/lib/auth/auth-routes';
import {
  useMemo,
  useState,
  useEffect,
  useContext,
  useCallback,
  createContext,
  type ReactNode,
} from 'react';

type SupabaseAuthContextValue = {
  supabase: typeof supabase;
  session: Session | null;
  user: User | null;
  /** The first login step is done, but the account's 6-digit code isn't. */
  mfaRequired: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | undefined>(undefined);

type SupabaseAuthProviderProps = {
  children: ReactNode;
};

export const SupabaseAuthProvider = ({ children }: SupabaseAuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        if (!active) return;
        setSession(initialSession ?? null);
      } catch {
        // A failed session read must not strand the app on a permanent
        // loading state (doc 90 1a) — treat as signed-out and move on.
        if (!active) return;
        setSession(null);
      }
      setIsLoading(false);
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;

      setSession(newSession ?? null);
      setIsLoading(false);
    });

    // Doc 90 1a: the ONE session-expired surface. authedFetch raises this
    // after a silent refresh-and-retry still came back 401.
    const onExpired = () => setSessionExpired(true);
    window.addEventListener('nf:session-expired', onExpired);

    // 2FA was turned on in another browser, so this one's copy of the user is
    // stale and it believes it's signed in. Refreshing brings the factor in, and
    // only then is it safe to go to /login: it would bounce straight back before.
    const onMfaRequired = async () => {
      const {
        data: { session: current },
      } = await supabase.auth.getSession();
      if (!current || needsSecondFactor(current.user, current.access_token)) return;

      const {
        data: { session: refreshed },
      } = await supabase.auth.refreshSession();
      if (!refreshed || !needsSecondFactor(refreshed.user, refreshed.access_token)) return;

      const { pathname, search } = window.location;
      if (!isAuthPage(pathname)) window.location.assign(loginHrefFrom(pathname, search));
    };
    window.addEventListener(MFA_REQUIRED_EVENT, onMfaRequired);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener('nf:session-expired', onExpired);
      window.removeEventListener(MFA_REQUIRED_EVENT, onMfaRequired);
    };
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    // scope 'local' signs out THIS browser only. The default ('global')
    // deletes every session the user has — logging out on one device killed
    // prod/localhost/mobile sessions everywhere, and tabs holding the dead
    // token then 401'd on every API call.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      // The logout request failed (offline, a server error): supabase-js then
      // keeps the session, and the next page would sign straight back in.
      // Logging out must log this browser out, so stop the token refresh and
      // drop the stored session here.
      await supabase.auth.stopAutoRefresh();
      clearStoredSession();
    }
    clearLoginIntent();
  }, []);

  // Until the code is entered this session counts as signed out everywhere, so
  // no page loads a wallet and the login form doesn't move on. The API refuses
  // it regardless (with-auth.ts); this is what makes the app match.
  const mfaRequired = !!session && needsSecondFactor(session.user, session.access_token);
  const signedInSession = mfaRequired ? null : session;

  const value = useMemo(
    () => ({
      supabase,
      session: signedInSession,
      user: signedInSession?.user ?? null,
      mfaRequired,
      isLoading,
      signOut,
    }),
    [signedInSession, mfaRequired, isLoading, signOut]
  );

  return (
    <SupabaseAuthContext.Provider value={value}>
      {sessionExpired && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '10px 16px',
            background: '#0A0A0F',
            color: '#fff',
            fontSize: 13.5,
            fontFamily: 'inherit',
          }}
        >
          Your session expired. Please sign in again to continue.
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            style={{
              border: '1px solid rgba(255,255,255,0.4)',
              background: 'transparent',
              color: '#fff',
              borderRadius: 8,
              padding: '4px 12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12.5,
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setSessionExpired(false)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
      )}
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = (): SupabaseAuthContextValue => {
  const context = useContext(SupabaseAuthContext);

  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }

  return context;
};

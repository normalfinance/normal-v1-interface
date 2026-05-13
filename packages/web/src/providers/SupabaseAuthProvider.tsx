'use client';

import type { User, Session } from '@supabase/supabase-js';

import { clearLoginIntent } from '@/lib/loginIntent';
import { supabase } from '@/lib/createSupabaseClient';
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

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!active) return;

      setSession(initialSession ?? null);
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

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    await supabase.auth.signOut();
    clearLoginIntent();
  }, []);

  const value = useMemo(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      isLoading,
      signOut,
    }),
    [session, isLoading, signOut]
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
};

export const useSupabaseAuth = (): SupabaseAuthContextValue => {
  const context = useContext(SupabaseAuthContext);

  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }

  return context;
};

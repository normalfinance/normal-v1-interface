import { supabase } from '@/lib/createSupabaseClient';

export const signInWithGoogle = async (): Promise<void> => {
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

  if (!redirectTo) {
    throw new Error('Unable to determine redirect URL for Google sign-in');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  if (data?.url) {
    window.location.href = data.url;
  }
};

export const exchangeCodeForSession = async (code: string) => {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }

  return data.session;
};
